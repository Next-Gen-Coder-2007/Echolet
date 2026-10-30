import { Response } from 'express';
import { MoreThan, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Story, StoryViewerItem, StoryLikeItem } from '../entities/Story';
import { Follow } from '../entities/Follow';
import { Notification } from '../entities/Notification';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emitNewStory, emitStoryDeleted, emitStoryViewed, emitStoryLiked, emitNotification } from '../socket';
import { supabaseStorage } from '../services/supabaseStorage.service';

export interface UserStoryGroup {
  userId: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  hasUnviewed: boolean;
  lastStoryTimestamp: string;
  stories: (Story & { isViewed?: boolean; isLiked?: boolean })[];
}

const getParamString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return (param[0] || '').trim();
  return (param || '').trim();
};

/**
 * Get all active, unexpired stories grouped by user.
 * Stories are only shown if we followed them or they followed us, or our own stories.
 */
export const getStories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.json({
        status: 'success',
        stories: [],
        userStoryGroups: [],
      });
      return;
    }

    const storyRepo = AppDataSource.getRepository(Story);
    const followRepo = AppDataSource.getRepository(Follow);

    // Find all follow records where current user is follower OR following
    const follows = await followRepo.find({
      where: [
        { followerId: currentUserId },
        { followingId: currentUserId },
      ],
      select: {
        followerId: true,
        followingId: true,
      },
    });

    const allowedUserIds = new Set<string>();
    // Always include current user's own stories
    allowedUserIds.add(currentUserId);

    follows.forEach((f) => {
      if (f.followerId === currentUserId) {
        // We followed them
        allowedUserIds.add(f.followingId);
      }
      if (f.followingId === currentUserId) {
        // They followed us
        allowedUserIds.add(f.followerId);
      }
    });

    const now = new Date();
    const activeStories = await storyRepo.find({
      where: {
        expiresAt: MoreThan(now),
        userId: In(Array.from(allowedUserIds)),
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const iFollowUserIds = new Set<string>();
    follows.forEach((f) => {
      if (f.followerId === currentUserId) {
        iFollowUserIds.add(f.followingId);
      }
    });

    // Group stories by userId
    const groupMap = new Map<string, UserStoryGroup>();

    activeStories.forEach((story) => {
      if (!story.user) return;
      if (story.user.isPrivate && story.userId !== currentUserId && !iFollowUserIds.has(story.userId)) {
        return;
      }

      const viewers: StoryViewerItem[] = Array.isArray(story.viewers) ? story.viewers : [];
      const isViewed = Boolean(currentUserId && viewers.some((v) => v.userId === currentUserId));

      const likes: StoryLikeItem[] = Array.isArray(story.likes) ? story.likes : [];
      const isLiked = Boolean(currentUserId && likes.some((l) => l.userId === currentUserId));

      const enrichedStory = {
        ...story,
        isViewed,
        isLiked,
      };

      if (!groupMap.has(story.userId)) {
        groupMap.set(story.userId, {
          userId: story.userId,
          user: {
            id: story.user.id,
            fullName: story.user.fullName,
            username: story.user.username,
            avatarUrl: story.user.avatarUrl,
          },
          hasUnviewed: !isViewed,
          lastStoryTimestamp: story.createdAt.toISOString(),
          stories: [enrichedStory],
        });
      } else {
        const group = groupMap.get(story.userId)!;
        group.stories.push(enrichedStory);
        if (!isViewed) {
          group.hasUnviewed = true;
        }
        if (new Date(story.createdAt).getTime() > new Date(group.lastStoryTimestamp).getTime()) {
          group.lastStoryTimestamp = story.createdAt.toISOString();
        }
      }
    });

    const groups = Array.from(groupMap.values());

    // Sort: Current user first, then users with unviewed stories, then by newest
    groups.sort((a, b) => {
      if (currentUserId) {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
      }
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.lastStoryTimestamp).getTime() - new Date(a.lastStoryTimestamp).getTime();
    });

    res.json({
      status: 'success',
      stories: activeStories,
      userStoryGroups: groups,
    });
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to fetch stories',
    });
  }
};

/**
 * Create a new 24h story
 */
export const createStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { mediaUrl, mediaType = 'image', content, backgroundColor, fontStyle, duration } = req.body;

    if (!mediaUrl && (!content || !content.trim())) {
      res.status(400).json({
        status: 'error',
        message: 'A story must have either a photo/video or text content.',
      });
      return;
    }

    if (mediaType === 'video' && duration && Number(duration) > 60) {
      res.status(400).json({
        status: 'error',
        message: 'Story videos must be 60 seconds (1 minute) or less.',
      });
      return;
    }

    const storyRepo = AppDataSource.getRepository(Story);

    // 24 hour expiration from creation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const resolvedMediaType: 'image' | 'video' | 'text' =
      mediaType === 'text' ? 'text' : mediaType === 'video' ? 'video' : 'image';

    let finalMediaUrl = mediaUrl || null;
    if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')) {
      finalMediaUrl = await supabaseStorage.uploadBase64(user.id, mediaUrl, 'stories');
    }

    const story = storyRepo.create({
      userId: user.id,
      mediaUrl: finalMediaUrl,
      mediaType: resolvedMediaType,
      duration: duration ? Math.min(60, Number(duration)) : null,
      content: content ? content.trim() : null,
      backgroundColor: backgroundColor || null,
      fontStyle: fontStyle || 'modern',
      viewsCount: 0,
      viewers: [],
      expiresAt,
    });

    await storyRepo.save(story);

    // Load user relation for socket emit and client display
    story.user = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    } as any;

    emitNewStory(story);

    res.status(201).json({
      status: 'success',
      message: 'Story posted successfully! It will disappear in 24 hours.',
      story,
    });
  } catch (error: any) {
    console.error('Error creating story:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to create story',
    });
  }
};

/**
 * View a story and increment view count
 */
export const viewStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const id = getParamString(req.params.id);
    const storyRepo = AppDataSource.getRepository(Story);

    const story = await storyRepo.findOne({
      where: { id },
    });

    if (!story) {
      res.status(404).json({ status: 'error', message: 'Story not found' });
      return;
    }

    // Verify view permissions: author, or we followed them, or they followed us
    if (story.userId !== user.id) {
      const followRepo = AppDataSource.getRepository(Follow);
      const isConnected = await followRepo.findOne({
        where: [
          { followerId: user.id, followingId: story.userId },
          { followerId: story.userId, followingId: user.id },
        ],
      });

      if (!isConnected) {
        res.status(403).json({
          status: 'error',
          message: 'You can only view stories of users you follow or who follow you.',
        });
        return;
      }
    }

    const viewers: StoryViewerItem[] = Array.isArray(story.viewers) ? [...story.viewers] : [];

    // Only record view if not own story and not already viewed
    const alreadyViewed = viewers.some((v) => v.userId === user.id);
    if (!alreadyViewed) {
      const newViewer: StoryViewerItem = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        viewedAt: new Date().toISOString(),
      };

      viewers.push(newViewer);
      story.viewers = viewers;
      story.viewsCount = viewers.length;

      await storyRepo.save(story);

      emitStoryViewed({
        storyId: story.id,
        viewer: newViewer,
        viewsCount: story.viewsCount,
      });
    }

    res.json({
      status: 'success',
      viewsCount: story.viewsCount,
      viewers: story.viewers,
    });
  } catch (error: any) {
    console.error('Error viewing story:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to view story',
    });
  }
};

/**
 * Delete a story (owner only)
 */
export const deleteStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const id = getParamString(req.params.id);
    const storyRepo = AppDataSource.getRepository(Story);

    const story = await storyRepo.findOne({
      where: { id },
    });

    if (!story) {
      res.status(404).json({ status: 'error', message: 'Story not found' });
      return;
    }

    if (story.userId !== user.id) {
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this story',
      });
      return;
    }

    if (story.mediaUrl) {
      await supabaseStorage.deleteFileByUrl(user.id, story.mediaUrl);
    }

    await storyRepo.remove(story);

    emitStoryDeleted({
      storyId: id,
      userId: user.id,
    });

    res.json({
      status: 'success',
      message: 'Story deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to delete story',
    });
  }
};

/**
 * Toggle like on a story with consolidated / aggregated notifications
 */
export const toggleLikeStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const id = getParamString(req.params.id);
    const storyRepo = AppDataSource.getRepository(Story);

    const story = await storyRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!story) {
      res.status(404).json({ status: 'error', message: 'Story not found' });
      return;
    }

    const likes: StoryLikeItem[] = Array.isArray(story.likes) ? [...story.likes] : [];
    const existingIndex = likes.findIndex((l) => l.userId === user.id);
    let isLiked = false;

    if (existingIndex >= 0) {
      // Remove like
      likes.splice(existingIndex, 1);
      isLiked = false;
    } else {
      // Add like
      const newLike: StoryLikeItem = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        likedAt: new Date().toISOString(),
      };
      likes.push(newLike);
      isLiked = true;
    }

    story.likes = likes;
    story.likesCount = likes.length;
    await storyRepo.save(story);

    const notificationRepo = AppDataSource.getRepository(Notification);

    if (isLiked && story.userId !== user.id) {
      // Consolidated notification:
      // If 1 person liked: "liked your story"
      // If 2 persons liked: "and [Second Person] liked your story"
      // If >2 persons liked: "and [N-1] others liked your story"
      let notifMessage = 'liked your story';
      if (likes.length === 2) {
        const otherLiker = likes.find((l) => l.userId !== user.id);
        const otherName = otherLiker?.fullName || otherLiker?.username || '1 person';
        notifMessage = `and ${otherName} liked your story`;
      } else if (likes.length > 2) {
        notifMessage = `and ${likes.length - 1} others liked your story`;
      }

      const existingNotif = await notificationRepo.findOne({
        where: {
          recipientId: story.userId,
          type: 'like',
          entityType: 'story',
          entityId: story.id,
        },
      });

      if (existingNotif) {
        existingNotif.actorId = user.id;
        existingNotif.message = notifMessage;
        existingNotif.isRead = false;
        existingNotif.createdAt = new Date();
        const savedNotif = await notificationRepo.save(existingNotif);
        const fullNotif = await notificationRepo.findOne({
          where: { id: savedNotif.id },
          relations: { actor: true },
        });
        if (fullNotif) emitNotification(fullNotif);
      } else {
        const newNotif = notificationRepo.create({
          recipientId: story.userId,
          actorId: user.id,
          type: 'like',
          entityType: 'story',
          entityId: story.id,
          message: notifMessage,
        });
        const savedNotif = await notificationRepo.save(newNotif);
        const fullNotif = await notificationRepo.findOne({
          where: { id: savedNotif.id },
          relations: { actor: true },
        });
        if (fullNotif) emitNotification(fullNotif);
      }
    } else if (!isLiked && story.userId !== user.id) {
      const existingNotif = await notificationRepo.findOne({
        where: {
          recipientId: story.userId,
          type: 'like',
          entityType: 'story',
          entityId: story.id,
        },
      });

      if (existingNotif) {
        if (likes.length === 0) {
          await notificationRepo.remove(existingNotif);
        } else {
          const lastLiker = likes[likes.length - 1];
          existingNotif.actorId = lastLiker.userId;
          if (likes.length === 1) {
            existingNotif.message = 'liked your story';
          } else if (likes.length === 2) {
            const other = likes.find((l) => l.userId !== lastLiker.userId);
            existingNotif.message = `and ${other?.fullName || other?.username || '1 person'} liked your story`;
          } else {
            existingNotif.message = `and ${likes.length - 1} others liked your story`;
          }
          await notificationRepo.save(existingNotif);
        }
      }
    }

    emitStoryLiked({
      storyId: story.id,
      userId: user.id,
      isLiked,
      likesCount: story.likesCount,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    });

    res.json({
      status: 'success',
      isLiked,
      likesCount: story.likesCount,
      likes: story.likes,
    });
  } catch (error: any) {
    console.error('Error toggling like on story:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to like story',
    });
  }
};
