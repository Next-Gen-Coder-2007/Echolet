import 'reflect-metadata';
import pg from 'pg';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../entities/User';
import { Follow } from '../entities/Follow';
import { Message } from '../entities/Message';
import { Post } from '../entities/Post';
import { PostLike } from '../entities/PostLike';
import { PostBookmark } from '../entities/PostBookmark';
import { Comment } from '../entities/Comment';
import { PollVote } from '../entities/PollVote';
import { CommentLike } from '../entities/CommentLike';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { GroupMessage } from '../entities/GroupMessage';
import { GlobalMessage } from '../entities/GlobalMessage';
import { Reel } from '../entities/Reel';
import { ReelLike } from '../entities/ReelLike';
import { ReelBookmark } from '../entities/ReelBookmark';
import { ReelComment } from '../entities/ReelComment';
import { ReelCommentReaction } from '../entities/ReelCommentReaction';
import { Story } from '../entities/Story';
import { BookmarkCollection } from '../entities/BookmarkCollection';
import { FollowRequest } from '../entities/FollowRequest';
import { Notification } from '../entities/Notification';

dotenv.config();

export const entitiesList = [
  User,
  Follow,
  FollowRequest,
  Notification,
  Message,
  Post,
  PostLike,
  PostBookmark,
  Comment,
  CommentLike,
  PollVote,
  Group,
  GroupMember,
  GroupMessage,
  GlobalMessage,
  Reel,
  ReelLike,
  ReelBookmark,
  ReelComment,
  ReelCommentReaction,
  Story,
  BookmarkCollection,
];

export const isVercelEnvironment = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.VERCEL_ENV
);

export const getDatabaseUrl = (): string | undefined => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  )?.trim();
};

export const isPostgresConfigured = (): boolean => {
  const url = getDatabaseUrl();
  return Boolean(url && (url.startsWith('postgres://') || url.startsWith('postgresql://')));
};

const sqlitePath = isVercelEnvironment
  ? path.join('/tmp', 'echolet.sqlite')
  : path.join(__dirname, '../../echolet.sqlite');

let actualDataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export const getDataSource = (): DataSource => {
  if (actualDataSource) {
    return actualDataSource;
  }

  const databaseUrl = getDatabaseUrl();
  const isPostgres = isPostgresConfigured();

  if (isPostgres && databaseUrl) {
    actualDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      driver: pg,
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: true,
      logging: false,
      entities: entitiesList,
      extra: {
        max: isVercelEnvironment ? 5 : 20,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      },
    });
    return actualDataSource;
  }

  if (isVercelEnvironment) {
    throw new Error(
      'DATABASE_URL environment variable is missing on Vercel. A PostgreSQL database (e.g. Neon, Supabase, Vercel Postgres) is required in serverless environments. Please configure DATABASE_URL in Vercel Project Settings > Environment Variables.'
    );
  }

  // Local development fallback to SQLite
  actualDataSource = new DataSource({
    type: 'better-sqlite3',
    database: sqlitePath,
    synchronize: true,
    logging: false,
    entities: entitiesList,
  });

  return actualDataSource;
};

// Export AppDataSource as a Proxy so module imports never crash during cold starts or build tracing
export const AppDataSource: DataSource = new Proxy({} as DataSource, {
  get(_target, prop, receiver) {
    if (prop === 'isInitialized') {
      return actualDataSource?.isInitialized ?? false;
    }
    const ds = getDataSource();
    const value = Reflect.get(ds, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(ds);
    }
    return value;
  },
  set(_target, prop, value, receiver) {
    const ds = getDataSource();
    return Reflect.set(ds, prop, value, receiver);
  },
  has(_target, prop) {
    if (prop === 'isInitialized') return true;
    const ds = getDataSource();
    return Reflect.has(ds, prop);
  },
});

export const connectDatabase = async (): Promise<DataSource> => {
  try {
    const ds = getDataSource();
    if (ds.isInitialized) {
      return ds;
    }
    if (!initPromise) {
      initPromise = ds
        .initialize()
        .then((initializedDs) => {
          const dbType =
            initializedDs.options.type === 'postgres' ? 'PostgreSQL' : `Local SQLite (${sqlitePath})`;
          console.log(`${dbType} database connected successfully.`);
          return initializedDs;
        })
        .catch((error) => {
          initPromise = null;
          console.error('Error connecting to database:', error);
          throw error;
        });
    }
    return await initPromise;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};

