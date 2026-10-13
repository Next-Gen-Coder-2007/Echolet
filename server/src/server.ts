import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { connectDatabase } from './config/database';
import { initSocket } from './socket';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import messageRoutes from './routes/message.routes';
import postRoutes from './routes/post.routes';
import groupRoutes from './routes/group.routes';
import globalChatRoutes from './routes/globalChat.routes';
import reelRoutes from './routes/reel.routes';
import searchRoutes from './routes/search.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy headers from cloud platforms (Render, Railway, Vercel, Nginx, AWS, Cloudflare)
app.set('trust proxy', 1);

const rawClientOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, server-to-server, curl) or registered origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Echolet Backend API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/global-chat', globalChatRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/search', searchRoutes);

const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

const startServer = async () => {
  try {
    await connectDatabase();
    httpServer.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();