import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, AppDataSource } from '../config/database';
import { supabaseStorage } from '../services/supabaseStorage.service';
import { User } from '../entities/User';
import { Post } from '../entities/Post';
import { Story } from '../entities/Story';
import { Reel } from '../entities/Reel';
import { Message } from '../entities/Message';
import { Group } from '../entities/Group';
import { GroupMessage } from '../entities/GroupMessage';
import { GlobalMessage } from '../entities/GlobalMessage';

async function migrateMedia() {
  console.log('--- Starting Echolet Supabase Media Migration ---');

  if (!supabaseStorage.isStorageConfigured()) {
    console.warn(
      'Warning: Supabase credentials are not fully configured in environment. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for migration.'
    );
  }

  await connectDatabase();
  console.log('Database connected successfully.');

  let totalMigrated = 0;

  // 1. Users (Avatars and Banners)
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find();
  console.log(`Checking ${users.length} users for local/base64 avatars and banners...`);

  for (const user of users) {
    let changed = false;

    if (user.avatarUrl && user.avatarUrl.startsWith('data:')) {
      try {
        console.log(`Migrating avatar for user: @${user.username} (${user.id})...`);
        user.avatarUrl = await supabaseStorage.uploadBase64(user.id, user.avatarUrl, 'avatars');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate avatar for user ${user.username}:`, err?.message || err);
      }
    }

    if (user.bannerUrl && user.bannerUrl.startsWith('data:')) {
      try {
        console.log(`Migrating banner for user: @${user.username} (${user.id})...`);
        user.bannerUrl = await supabaseStorage.uploadBase64(user.id, user.bannerUrl, 'banners');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate banner for user ${user.username}:`, err?.message || err);
      }
    }

    if (changed) {
      await userRepo.save(user);
    }
  }

  // 2. Posts (mediaUrls)
  const postRepo = AppDataSource.getRepository(Post);
  const posts = await postRepo.find();
  console.log(`Checking ${posts.length} posts for media attachments...`);

  for (const post of posts) {
    if (post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) {
      let changed = false;
      const updatedUrls: string[] = [];

      for (const url of post.mediaUrls) {
        if (typeof url === 'string' && url.startsWith('data:')) {
          try {
            console.log(`Migrating post media (${post.id})...`);
            const migratedUrl = await supabaseStorage.uploadBase64(post.userId, url, 'posts');
            updatedUrls.push(migratedUrl);
            changed = true;
            totalMigrated++;
          } catch (err: any) {
            console.error(`Failed to migrate post media (${post.id}):`, err?.message || err);
            updatedUrls.push(url); // preserve original on error
          }
        } else {
          updatedUrls.push(url);
        }
      }

      if (changed) {
        post.mediaUrls = updatedUrls;
        await postRepo.save(post);
      }
    }
  }

  // 3. Stories
  const storyRepo = AppDataSource.getRepository(Story);
  const stories = await storyRepo.find();
  console.log(`Checking ${stories.length} stories...`);

  for (const story of stories) {
    if (story.mediaUrl && story.mediaUrl.startsWith('data:')) {
      try {
        console.log(`Migrating story media (${story.id})...`);
        story.mediaUrl = await supabaseStorage.uploadBase64(story.userId, story.mediaUrl, 'stories');
        await storyRepo.save(story);
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate story media (${story.id}):`, err?.message || err);
      }
    }
  }

  // 4. Reels
  const reelRepo = AppDataSource.getRepository(Reel);
  const reels = await reelRepo.find();
  console.log(`Checking ${reels.length} reels...`);

  for (const reel of reels) {
    let changed = false;
    if (reel.videoUrl && reel.videoUrl.startsWith('data:')) {
      try {
        console.log(`Migrating reel video (${reel.id})...`);
        reel.videoUrl = await supabaseStorage.uploadBase64(reel.userId, reel.videoUrl, 'reels');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate reel video (${reel.id}):`, err?.message || err);
      }
    }

    if (reel.thumbnailUrl && reel.thumbnailUrl.startsWith('data:')) {
      try {
        console.log(`Migrating reel thumbnail (${reel.id})...`);
        reel.thumbnailUrl = await supabaseStorage.uploadBase64(reel.userId, reel.thumbnailUrl, 'reels');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate reel thumbnail (${reel.id}):`, err?.message || err);
      }
    }

    if (changed) {
      await reelRepo.save(reel);
    }
  }

  // 5. Messages
  const messageRepo = AppDataSource.getRepository(Message);
  const messages = await messageRepo.find();
  console.log(`Checking ${messages.length} 1-on-1 messages...`);

  for (const msg of messages) {
    let changed = false;
    if (msg.mediaUrl && msg.mediaUrl.startsWith('data:')) {
      try {
        msg.mediaUrl = await supabaseStorage.uploadBase64(msg.senderId, msg.mediaUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate message media (${msg.id}):`, err?.message || err);
      }
    }

    if (msg.audioUrl && msg.audioUrl.startsWith('data:')) {
      try {
        msg.audioUrl = await supabaseStorage.uploadBase64(msg.senderId, msg.audioUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate message audio (${msg.id}):`, err?.message || err);
      }
    }

    if (changed) {
      await messageRepo.save(msg);
    }
  }

  // 6. Groups
  const groupRepo = AppDataSource.getRepository(Group);
  const groups = await groupRepo.find();
  console.log(`Checking ${groups.length} groups...`);

  for (const group of groups) {
    if (group.avatarUrl && group.avatarUrl.startsWith('data:')) {
      try {
        group.avatarUrl = await supabaseStorage.uploadBase64(group.creatorId || 'group', group.avatarUrl, 'groups');
        await groupRepo.save(group);
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate group avatar (${group.id}):`, err?.message || err);
      }
    }
  }

  // 7. Group Messages
  const groupMsgRepo = AppDataSource.getRepository(GroupMessage);
  const groupMsgs = await groupMsgRepo.find();
  console.log(`Checking ${groupMsgs.length} group messages...`);

  for (const gMsg of groupMsgs) {
    let changed = false;
    const sender = gMsg.senderId || 'group_user';
    if (gMsg.mediaUrl && gMsg.mediaUrl.startsWith('data:')) {
      try {
        gMsg.mediaUrl = await supabaseStorage.uploadBase64(sender, gMsg.mediaUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate group message media (${gMsg.id}):`, err?.message || err);
      }
    }
    if (gMsg.audioUrl && gMsg.audioUrl.startsWith('data:')) {
      try {
        gMsg.audioUrl = await supabaseStorage.uploadBase64(sender, gMsg.audioUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate group message audio (${gMsg.id}):`, err?.message || err);
      }
    }
    if (changed) {
      await groupMsgRepo.save(gMsg);
    }
  }

  // 8. Global Messages
  const globalMsgRepo = AppDataSource.getRepository(GlobalMessage);
  const globalMsgs = await globalMsgRepo.find();
  console.log(`Checking ${globalMsgs.length} global messages...`);

  for (const globMsg of globalMsgs) {
    let changed = false;
    const sender = globMsg.senderId || 'global_user';
    if (globMsg.mediaUrl && globMsg.mediaUrl.startsWith('data:')) {
      try {
        globMsg.mediaUrl = await supabaseStorage.uploadBase64(sender, globMsg.mediaUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate global message media (${globMsg.id}):`, err?.message || err);
      }
    }
    if (globMsg.audioUrl && globMsg.audioUrl.startsWith('data:')) {
      try {
        globMsg.audioUrl = await supabaseStorage.uploadBase64(sender, globMsg.audioUrl, 'chat');
        changed = true;
        totalMigrated++;
      } catch (err: any) {
        console.error(`Failed to migrate global message audio (${globMsg.id}):`, err?.message || err);
      }
    }
    if (changed) {
      await globalMsgRepo.save(globMsg);
    }
  }

  console.log(`--- Migration complete! Total media assets processed/migrated: ${totalMigrated} ---`);
  process.exit(0);
}

migrateMedia().catch((err) => {
  console.error('Migration encountered fatal error:', err);
  process.exit(1);
});
