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
import storyRoutes from './routes/story.routes';
import collectionRoutes from './routes/collection.routes';
import notificationRoutes from './routes/notification.routes';

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

// Health check endpoint - always accessible even if database is still connecting/configuring
const handleHealthCheck = async (_req: Request, res: Response) => {
  const isVercel = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV
  );

  let dbStatus = 'disconnected';
  let dbError: string | null = null;
  let dbType = process.env.DATABASE_URL || process.env.POSTGRES_URL ? 'PostgreSQL' : (isVercel ? 'None' : 'SQLite');

  try {
    const ds = await connectDatabase();
    if (ds.isInitialized) {
      dbStatus = 'connected';
      dbType = ds.options.type === 'postgres' ? 'PostgreSQL' : 'SQLite';
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err?.message || 'Database connection error';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    message: isHealthy
      ? 'Echolet Backend API is running smoothly'
      : 'Echolet Backend is running, but database connection could not be established.',
    database: {
      status: dbStatus,
      type: dbType,
      error: dbError,
    },
    environment: isVercel ? 'vercel-serverless' : 'standalone-server',
    help:
      !isHealthy && isVercel
        ? 'Please set DATABASE_URL (PostgreSQL connection string from Neon, Supabase, or Railway) in your Vercel Project Settings > Environment Variables.'
        : undefined,
    timestamp: new Date().toISOString(),
  });
};

app.get('/', handleHealthCheck);
app.get('/api', handleHealthCheck);
app.get('/health', handleHealthCheck);

// Serverless DB connection verification middleware for API requests
app.use(async (req: Request, res: Response, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    await connectDatabase();
    next();
  } catch (error: any) {
    console.error('Database connection middleware failed:', error?.message || error);
    const isVercel = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL_ENV
    );

    return res.status(503).json({
      error: 'Database Unavailable',
      message: error?.message || 'Failed to connect to the database.',
      hint: isVercel
        ? 'A PostgreSQL database is required on Vercel. Please add DATABASE_URL to your Vercel Project Settings > Environment Variables (e.g. from Neon, Supabase, or Railway).'
        : 'Please ensure your database is running and configuration is correct.',
    });
  }
});

// Mount routes with and without '/api' prefix for versatile reverse-proxy and rewrite compatibility
const mountRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/messages`, messageRoutes);
  app.use(`${prefix}/groups`, groupRoutes);
  app.use(`${prefix}/posts`, postRoutes);
  app.use(`${prefix}/global-chat`, globalChatRoutes);
  app.use(`${prefix}/reels`, reelRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/stories`, storyRoutes);
  app.use(`${prefix}/collections`, collectionRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
};

mountRoutes('/api');
mountRoutes('');

// 404 Handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

export default app;

