import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from './config/database';
import { Message } from './entities/Message';
import { User } from './entities/User';
import { GroupMember } from './entities/GroupMember';
import { GroupMessage } from './entities/GroupMessage';
import { Group } from './entities/Group';
import { GlobalMessage } from './entities/GlobalMessage';
import { Follow } from './entities/Follow';
import { Notification } from './entities/Notification';

let io: SocketIOServer | null = null;

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();
// Track socketId -> userId
const socketToUser = new Map<string, string>();

// Track active ongoing calls: userId -> partnerId
const activeCalls = new Map<string, string>();

// Global chat presence tracking
const globalChatSockets = new Set<string>();
const globalChatUserCounts = new Map<string, number>();

export const getGlobalOnlineCount = (): number => {
  return globalChatUserCounts.size > 0 ? globalChatUserCounts.size : globalChatSockets.size;
};

export const isUserOnline = (userId: string): boolean => {
  return (onlineUsers.get(userId)?.size ?? 0) > 0;
};

export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

export const initSocket = (server: HttpServer, clientOrigin: string | string[]): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: clientOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join', async (userId: string) => {
      if (!userId) return;

      socket.join(userId);
      socketToUser.set(socket.id, userId);

      const wasOnline = isUserOnline(userId);
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Join all group rooms the user belongs to
      try {
        if (AppDataSource.isInitialized) {
          const memberRepository = AppDataSource.getRepository(GroupMember);
          const userGroups = await memberRepository.find({
            where: { userId },
            select: { groupId: true },
          });
          userGroups.forEach((g) => {
            socket.join(`group:${g.groupId}`);
          });
        }
      } catch (err) {
        console.error('Error joining group rooms on connect:', err);
      }

      // Send the currently online users list to this client
      socket.emit('online_users', Array.from(onlineUsers.keys()));

      // Send current unread count to this client
      await emitUnreadCount(userId);
      await emitNotificationCount(userId);

      // Broadcast user online event if user just connected
      if (!wasOnline) {
        io?.emit('user_status', { userId, isOnline: true });
      }

      // Mark unread messages sent to this user as 'delivered'
      try {
        if (AppDataSource.isInitialized) {
          const messageRepository = AppDataSource.getRepository(Message);
          const undeliveredMessages = await messageRepository.find({
            where: { receiverId: userId, status: 'sent' },
          });

          if (undeliveredMessages.length > 0) {
            await messageRepository.update(
              { receiverId: userId, status: 'sent' },
              { status: 'delivered' }
            );

            // Group by senderId and notify each sender
            const senderIds = new Set(undeliveredMessages.map((m) => m.senderId));
            senderIds.forEach((senderId) => {
              const ids = undeliveredMessages
                .filter((m) => m.senderId === senderId)
                .map((m) => m.id);
              io?.to(senderId).emit('messages_delivered', {
                receiverId: userId,
                messageIds: ids,
              });
            });
          }
        }
      } catch (err) {
        console.error('Error marking messages as delivered on join:', err);
      }
    });

    socket.on('leave', (userId: string) => {
      if (!userId) return;
      socket.leave(userId);
      handleUserDisconnect(socket.id, userId);
    });

    // Group room subscriptions
    socket.on('join_group', (groupId: string) => {
      if (groupId) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('leave_group', (groupId: string) => {
      if (groupId) {
        socket.leave(`group:${groupId}`);
      }
    });

    // Real-time mark-as-read via WebSocket
    socket.on('mark_as_read', async ({ readerId, partnerId }: { readerId: string; partnerId: string }) => {
      if (!readerId || !partnerId) return;
      try {
        if (AppDataSource.isInitialized) {
          const messageRepository = AppDataSource.getRepository(Message);
          const unread = await messageRepository.find({
            where: { senderId: partnerId, receiverId: readerId, isRead: false },
          });

          if (unread.length > 0) {
            const ids = unread.map((m) => m.id);
            await messageRepository
              .createQueryBuilder()
              .update(Message)
              .set({ isRead: true, status: 'read' })
              .where('id IN (:...ids)', { ids })
              .execute();

            emitMessagesRead(readerId, partnerId, ids);
          }
          await emitUnreadCount(readerId);
        }
      } catch (err) {
        console.error('Socket mark_as_read error:', err);
      }
    });

    // Typing indicators
    socket.on('typing', ({ senderId, receiverId }: { senderId: string; receiverId: string }) => {
      if (receiverId) {
        io?.to(receiverId).emit('typing', { senderId, receiverId });
      }
    });

    socket.on('stop_typing', ({ senderId, receiverId }: { senderId: string; receiverId: string }) => {
      if (receiverId) {
        io?.to(receiverId).emit('stop_typing', { senderId, receiverId });
      }
    });

    // Group Typing indicators
    socket.on(
      'group_typing',
      ({
        groupId,
        userId,
        userName,
      }: {
        groupId: string;
        userId: string;
        userName: string;
      }) => {
        if (groupId) {
          socket.to(`group:${groupId}`).emit('group_typing', {
            groupId,
            userId,
            userName,
          });
        }
      }
    );

    socket.on(
      'group_stop_typing',
      ({ groupId, userId }: { groupId: string; userId: string }) => {
        if (groupId) {
          socket.to(`group:${groupId}`).emit('group_stop_typing', {
            groupId,
            userId,
          });
        }
      }
    );

    // Global chat subscriptions & presence
    socket.on('join_global_chat', (userId?: string) => {
      socket.join('global_chat');
      globalChatSockets.add(socket.id);
      const uid = userId || socketToUser.get(socket.id);
      if (uid) {
        globalChatUserCounts.set(uid, (globalChatUserCounts.get(uid) || 0) + 1);
      }
      io?.to('global_chat').emit('global_online_count', { count: getGlobalOnlineCount() });
    });

    socket.on('leave_global_chat', (userId?: string) => {
      socket.leave('global_chat');
      globalChatSockets.delete(socket.id);
      const uid = userId || socketToUser.get(socket.id);
      if (uid && globalChatUserCounts.has(uid)) {
        const count = globalChatUserCounts.get(uid)! - 1;
        if (count <= 0) {
          globalChatUserCounts.delete(uid);
        } else {
          globalChatUserCounts.set(uid, count);
        }
      }
      io?.to('global_chat').emit('global_online_count', { count: getGlobalOnlineCount() });
    });

    // Global typing indicators
    socket.on(
      'global_typing',
      ({
        userId,
        username,
        fullName,
      }: {
        userId: string;
        username: string;
        fullName?: string;
      }) => {
        socket.to('global_chat').emit('global_typing', {
          userId,
          username,
          fullName,
        });
      }
    );

    socket.on('global_stop_typing', ({ userId }: { userId: string }) => {
      socket.to('global_chat').emit('global_stop_typing', { userId });
    });

    // ======================== VOICE & WEBRTC CALL SIGNALING ========================
    socket.on(
      'call:initiate',
      async (payload: {
        toUserId: string;
        caller: {
          id: string;
          fullName: string;
          username: string;
          avatarUrl?: string;
        };
      }) => {
        const { toUserId, caller } = payload;
        if (!toUserId || !caller) return;
        const senderId = socketToUser.get(socket.id) || caller.id;

        if (toUserId === senderId) return;

        // Check if recipient is online
        if (!isUserOnline(toUserId)) {
          socket.emit('call:user_offline', { toUserId });
          return;
        }

        // Check if either party is currently in an active call
        if (activeCalls.has(toUserId) || activeCalls.has(senderId)) {
          socket.emit('call:busy', { toUserId });
          return;
        }

        // Verify recipient permissions and private account restrictions
        if (AppDataSource.isInitialized) {
          try {
            const userRepository = AppDataSource.getRepository(User);
            const targetUser = await userRepository.findOne({
              where: { id: toUserId },
              select: { id: true, isPrivate: true, blockedUsers: true },
            });

            if (!targetUser) return;

            // Check if blocked
            if (targetUser.blockedUsers && targetUser.blockedUsers.includes(senderId)) {
              socket.emit('call:restricted', {
                toUserId,
                message: 'You cannot call this contact.',
              });
              return;
            }

            // If private account: caller must follow target (accepted follow request) OR target follows caller
            if (targetUser.isPrivate) {
              const followRepo = AppDataSource.getRepository(Follow);
              const isFollowing = await followRepo.findOne({
                where: { followerId: senderId, followingId: toUserId },
              });
              const isFollowedBy = await followRepo.findOne({
                where: { followerId: toUserId, followingId: senderId },
              });

              if (!isFollowing && !isFollowedBy) {
                socket.emit('call:restricted', {
                  toUserId,
                  message:
                    'This account is private. You can only call them if they accept your follow request or if they follow you.',
                });
                return;
              }
            }
          } catch (err) {
            console.error('Error verifying call permissions:', err);
          }
        }

        // Forward incoming call event to recipient room
        io?.to(toUserId).emit('call:incoming', {
          caller,
          fromUserId: senderId,
        });
      }
    );

    socket.on('call:accept', (payload: { toUserId: string }) => {
      const currentUserId = socketToUser.get(socket.id);
      if (!currentUserId || !payload?.toUserId) return;

      activeCalls.set(currentUserId, payload.toUserId);
      activeCalls.set(payload.toUserId, currentUserId);

      io?.to(payload.toUserId).emit('call:accepted', {
        fromUserId: currentUserId,
      });
    });

    socket.on('call:reject', (payload: { toUserId: string; reason?: string }) => {
      const currentUserId = socketToUser.get(socket.id);
      if (!payload?.toUserId) return;

      io?.to(payload.toUserId).emit('call:rejected', {
        fromUserId: currentUserId,
        reason: payload.reason || 'declined',
      });
    });

    socket.on('call:signal', (payload: { toUserId: string; signal: any }) => {
      const currentUserId = socketToUser.get(socket.id);
      if (!payload?.toUserId || !payload?.signal) return;

      io?.to(payload.toUserId).emit('call:signal', {
        fromUserId: currentUserId,
        signal: payload.signal,
      });
    });

    socket.on('call:end', (payload: { toUserId?: string }) => {
      const currentUserId = socketToUser.get(socket.id);
      if (currentUserId) {
        const partnerId = payload?.toUserId || activeCalls.get(currentUserId);
        activeCalls.delete(currentUserId);
        if (partnerId) {
          activeCalls.delete(partnerId);
          io?.to(partnerId).emit('call:ended', {
            fromUserId: currentUserId,
            reason: 'hangup',
          });
        }
      }
    });

    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (globalChatSockets.has(socket.id)) {
        globalChatSockets.delete(socket.id);
        if (userId && globalChatUserCounts.has(userId)) {
          const count = globalChatUserCounts.get(userId)! - 1;
          if (count <= 0) {
            globalChatUserCounts.delete(userId);
          } else {
            globalChatUserCounts.set(userId, count);
          }
        }
        io?.to('global_chat').emit('global_online_count', { count: getGlobalOnlineCount() });
      }
      if (userId) {
        handleUserDisconnect(socket.id, userId);
      }
    });
  });

  return io;
};

const handleUserDisconnect = async (socketId: string, userId: string) => {
  socketToUser.delete(socketId);

  // Terminate active call if user disconnected
  if (activeCalls.has(userId)) {
    const partnerId = activeCalls.get(userId);
    activeCalls.delete(userId);
    if (partnerId) {
      activeCalls.delete(partnerId);
      io?.to(partnerId).emit('call:ended', {
        fromUserId: userId,
        reason: 'disconnected',
      });
    }
  }

  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    const lastSeen = new Date();

    // Persist lastSeen to database
    try {
      if (AppDataSource.isInitialized) {
        const userRepository = AppDataSource.getRepository(User);
        await userRepository.update(userId, { lastSeen });
      }
    } catch (err) {
      console.error('Failed to update user lastSeen in DB:', err);
    }

    io?.emit('user_status', {
      userId,
      isOnline: false,
      lastSeen: lastSeen.toISOString(),
    });
  }
};

export const getIO = (): SocketIOServer | null => io;

export const emitUnreadCount = async (userId: string) => {
  if (!io || !AppDataSource.isInitialized) return;
  try {
    const messageRepository = AppDataSource.getRepository(Message);
    const count = await messageRepository.count({
      where: { receiverId: userId, isRead: false },
    });
    io.to(userId).emit('unread_count', { count });
  } catch (err) {
    console.error('Failed to emit unread count:', err);
  }
};

export const emitNewMessage = async (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('new_message', message);
  if (message.receiverId !== message.senderId) {
    io.to(message.senderId).emit('new_message', message);
  }
  // Send updated unread count to receiver in real time
  await emitUnreadCount(message.receiverId);
};

export const emitMessagesRead = (readerId: string, partnerId: string, messageIds: string[]) => {
  if (!io) return;
  // Notify sender (partnerId) so their message ticks turn double blue in real-time
  io.to(partnerId).emit('messages_read', { readerId, partnerId, messageIds });
  if (readerId !== partnerId) {
    // Notify reader (readerId) so their own tabs/badges update in real-time
    io.to(readerId).emit('messages_read', { readerId, partnerId, messageIds });
  }
  // Emit updated unread count to reader in real time
  emitUnreadCount(readerId).catch(console.error);
};

export const emitMessageEdited = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_edited', message);
  if (message.receiverId !== message.senderId) {
    io.to(message.senderId).emit('message_edited', message);
  }
};

export const emitMessageDeletedForEveryone = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_deleted_for_everyone', {
    messageId: message.id,
    content: message.content,
    isDeletedForEveryone: true,
  });
  if (message.receiverId !== message.senderId) {
    io.to(message.senderId).emit('message_deleted_for_everyone', {
      messageId: message.id,
      content: message.content,
      isDeletedForEveryone: true,
    });
  }
};

export const emitMessageStarred = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_starred', message);
  if (message.receiverId !== message.senderId) {
    io.to(message.senderId).emit('message_starred', message);
  }
};

export const emitMessagePinned = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_pinned', message);
  if (message.receiverId !== message.senderId) {
    io.to(message.senderId).emit('message_pinned', message);
  }
};

export const emitChatCleared = (userId: string, partnerId: string) => {
  if (!io) return;
  io.to(userId).emit('chat_cleared', { userId, partnerId });
};

export const emitGroupMessageStarred = (message: any) => {
  if (!io) return;
  io.to(`group:${message.groupId}`).emit('group_message_starred', message);
};

export const emitGroupMessagePinned = (message: any) => {
  if (!io) return;
  io.to(`group:${message.groupId}`).emit('group_message_pinned', message);
};

export const emitGroupChatCleared = (groupId: string, userId: string) => {
  if (!io) return;
  io.to(userId).emit('group_chat_cleared', { groupId, userId });
};

export const emitChatSettingsUpdated = (userId: string, settings: any) => {
  if (!io) return;
  io.to(userId).emit('chat_settings_updated', settings);
};

export const emitNewPost = (post: any) => {
  if (!io) return;
  io.emit('new_post', post);
};

export const emitPostDeleted = (postId: string) => {
  if (!io) return;
  io.emit('post_deleted', { postId });
};

export const emitPostLiked = (data: { postId: string; userId: string; likesCount: number; isLiked: boolean }) => {
  if (!io) return;
  io.emit('post_liked', data);
};

export const emitPostReactionUpdated = (data: {
  postId: string;
  reactions: any[];
  likesCount: number;
  userId?: string;
  userReaction?: string | null;
}) => {
  if (!io) return;
  io.emit('post_reaction_updated', data);
};

export const emitNewComment = (comment: any) => {
  if (!io) return;
  io.emit('new_comment', comment);
};

export const emitPostPollVoted = (data: {
  postId: string;
  pollOptions: any[];
  userVotedOption?: number | null;
  userId?: string;
}) => {
  if (!io) return;
  io.emit('post_poll_voted', data);
};

export const emitNewGroupMessage = (message: any) => {
  if (!io) return;
  io.to(`group:${message.groupId}`).emit('new_group_message', message);
};

export const emitGroupMessageEdited = (message: any) => {
  if (!io) return;
  io.to(`group:${message.groupId}`).emit('group_message_edited', message);
};

export const emitGroupMessageDeleted = (
  groupId: string,
  messageId: string,
  isDeletedForEveryone: boolean
) => {
  if (!io) return;
  io.to(`group:${groupId}`).emit('group_message_deleted', {
    groupId,
    messageId,
    isDeletedForEveryone,
  });
};

export const emitGroupUpdated = (group: any) => {
  if (!io) return;
  io.to(`group:${group.id}`).emit('group_updated', group);
};

export const emitGroupCreated = (group: any, memberUserIds: string[]) => {
  if (!io) return;
  memberUserIds.forEach((userId) => {
    io?.to(userId).emit('group_created', group);
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((sId) => {
        io?.sockets.sockets.get(sId)?.join(`group:${group.id}`);
      });
    }
  });
};

export const emitGroupMemberUpdate = (
  groupId: string,
  event: 'joined' | 'left' | 'removed' | 'role_changed',
  memberData: any
) => {
  if (!io) return;
  io.to(`group:${groupId}`).emit('group_member_update', {
    groupId,
    event,
    ...memberData,
  });
};

export const addUsersToGroupSocketRoom = (groupId: string, userIds: string[]) => {
  if (!io) return;
  userIds.forEach((userId) => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((sId) => {
        io?.sockets.sockets.get(sId)?.join(`group:${groupId}`);
      });
    }
  });
};

export const removeUsersFromGroupSocketRoom = (groupId: string, userIds: string[]) => {
  if (!io) return;
  userIds.forEach((userId) => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((sId) => {
        io?.sockets.sockets.get(sId)?.leave(`group:${groupId}`);
      });
    }
  });
};

export const emitGlobalMessage = (message: GlobalMessage) => {
  if (!io) return;
  io.emit('global_new_message', message);
};

export const emitGlobalMessageEdited = (message: GlobalMessage) => {
  if (!io) return;
  io.emit('global_message_edited', message);
};

export const emitGlobalMessageDeleted = (messageId: string) => {
  if (!io) return;
  io.emit('global_message_deleted', { messageId });
};

export const emitGlobalReactionUpdated = (
  messageId: string,
  reactions: Record<string, string[]>
) => {
  if (!io) return;
  io.emit('global_reaction_updated', { messageId, reactions });
};

export const emitGlobalChatCleared = () => {
  if (!io) return;
  io.emit('global_chat_cleared', {});
};

export const emitNewStory = async (story: any) => {
  if (!io || !story?.userId) return;
  try {
    const followRepo = AppDataSource.getRepository(Follow);
    const follows = await followRepo.find({
      where: [
        { followerId: story.userId },
        { followingId: story.userId },
      ],
      select: {
        followerId: true,
        followingId: true,
      },
    });

    const targetUserIds = new Set<string>();
    targetUserIds.add(story.userId); // Always send to author

    follows.forEach((f) => {
      if (f.followerId === story.userId) {
        // Author follows them
        targetUserIds.add(f.followingId);
      }
      if (f.followingId === story.userId) {
        // They follow the author
        targetUserIds.add(f.followerId);
      }
    });

    targetUserIds.forEach((targetId) => {
      io?.to(targetId).emit('new_story', story);
    });
  } catch (err) {
    console.error('Error emitting new story to followers/following:', err);
    io.to(story.userId).emit('new_story', story);
  }
};

export const emitStoryDeleted = async (data: { storyId: string; userId: string }) => {
  if (!io || !data?.userId) return;
  try {
    const followRepo = AppDataSource.getRepository(Follow);
    const follows = await followRepo.find({
      where: [
        { followerId: data.userId },
        { followingId: data.userId },
      ],
      select: {
        followerId: true,
        followingId: true,
      },
    });

    const targetUserIds = new Set<string>();
    targetUserIds.add(data.userId);

    follows.forEach((f) => {
      if (f.followerId === data.userId) targetUserIds.add(f.followingId);
      if (f.followingId === data.userId) targetUserIds.add(f.followerId);
    });

    targetUserIds.forEach((targetId) => {
      io?.to(targetId).emit('story_deleted', data);
    });
  } catch (err) {
    console.error('Error emitting story deleted:', err);
    io.emit('story_deleted', data);
  }
};

export const emitStoryViewed = (data: { storyId: string; viewer: any; viewsCount: number }) => {
  if (!io) return;
  io.emit('story_viewed', data);
};

export const emitStoryLiked = (data: {
  storyId: string;
  userId: string;
  isLiked: boolean;
  likesCount: number;
  user?: any;
}) => {
  if (!io) return;
  io.emit('story_liked', data);
};

export const emitFollowUpdated = (data: { followerId: string; followingId: string; isFollowing: boolean }) => {
  if (!io) return;
  io.to(data.followerId).emit('follow_updated', data);
  io.to(data.followingId).emit('follow_updated', data);
};

export const emitMessageReactionUpdated = (data: {
  messageId: string;
  senderId: string;
  receiverId: string;
  reactions: any[];
}) => {
  if (!io) return;
  io.to(data.senderId).emit('message_reaction_updated', data);
  io.to(data.receiverId).emit('message_reaction_updated', data);
};

export const emitGroupMessageReactionUpdated = (data: {
  messageId: string;
  groupId: string;
  reactions: any[];
}) => {
  if (!io) return;
  io.to(`group:${data.groupId}`).emit('group_message_reaction_updated', data);
};

export const emitNotificationCount = async (userId: string) => {
  if (!io || !AppDataSource.isInitialized) return;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const notificationRepository = AppDataSource.getRepository(Notification);
    const count = await notificationRepository.count({
      where: {
        recipientId: userId,
        isRead: false,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });
    io.to(userId).emit('notification_count', { count });
  } catch (err) {
    console.error('Failed to emit notification count:', err);
  }
};

export const emitNotification = async (notification: Notification) => {
  if (!io) return;
  io.to(notification.recipientId).emit('new_notification', notification);
  await emitNotificationCount(notification.recipientId);
};

export const emitFollowRequestUpdated = (data: {
  requesterId: string;
  targetId: string;
  status: string;
  requestId?: string;
}) => {
  if (!io) return;
  io.to(data.requesterId).emit('follow_request_updated', data);
  io.to(data.targetId).emit('follow_request_updated', data);
};


