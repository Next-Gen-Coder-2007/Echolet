import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Message } from './entities/Message';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer, clientOrigin: string | string[]): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: clientOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join', (userId: string) => {
      if (userId) {
        socket.join(userId);
      }
    });

    socket.on('leave', (userId: string) => {
      if (userId) {
        socket.leave(userId);
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => io;

export const emitNewMessage = (message: Message) => {
  if (!io) return;
  io.to(message.receiverId).emit('new_message', message);
  io.to(message.senderId).emit('new_message', message);
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

