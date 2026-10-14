import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
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

// Trust proxy headers from cloud platforms (Vercel, Render, Railway, Nginx, AWS, Cloudflare)
app.set('trust proxy', 1);

const rawClientOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const allowedOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
  // Automatically allow localhost development ports
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Automatically allow Vercel preview & production deployments
  if (/^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-zA-Z0-9_.-]+\.now\.sh$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
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

// Serverless DB connection verification middleware
app.use(async (_req: Request, _res: Response, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error('Database connection middleware failed:', error);
    next(error);
  }
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Echolet Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel-serverless' : 'standalone-server',
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

export default app;
