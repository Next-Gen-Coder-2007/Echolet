import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AppDataSource } from './config/database';
import { Message } from './entities/Message';
import { User } from './entities/User';

let io: SocketIOServer | null = null;

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();
// Track socketId -> userId
const socketToUser = new Map<string, string>();

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

      // Send the currently online users list to this client
      socket.emit('online_users', Array.from(onlineUsers.keys()));

      // Send current unread count to this client
      await emitUnreadCount(userId);

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

    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        handleUserDisconnect(socket.id, userId);
      }
    });
  });

  return io;
};

const handleUserDisconnect = async (socketId: string, userId: string) => {
  socketToUser.delete(socketId);
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
  io.to(message.senderId).emit('new_message', message);
  // Send updated unread count to receiver in real time
  await emitUnreadCount(message.receiverId);
};

export const emitMessagesRead = (readerId: string, partnerId: string, messageIds: string[]) => {
  if (!io) return;
  // Notify sender (partnerId) so their message ticks turn double blue in real-time
  io.to(partnerId).emit('messages_read', { readerId, partnerId, messageIds });
  // Notify reader (readerId) so their own tabs/badges update in real-time
  io.to(readerId).emit('messages_read', { readerId, partnerId, messageIds });
  // Emit updated unread count to reader in real time
  emitUnreadCount(readerId).catch(console.error);
};

export const emitMessageEdited = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_edited', message);
  io.to(message.senderId).emit('message_edited', message);
};

export const emitMessageDeletedForEveryone = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('message_deleted_for_everyone', {
    messageId: message.id,
    content: message.content,
    isDeletedForEveryone: true,
  });
  io.to(message.senderId).emit('message_deleted_for_everyone', {
    messageId: message.id,
    content: message.content,
    isDeletedForEveryone: true,
  });
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

export const emitNewComment = (comment: any) => {
  if (!io) return;
  io.emit('new_comment', comment);
};
