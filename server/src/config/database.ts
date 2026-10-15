import 'reflect-metadata';
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

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const isPostgres =
  databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://');

const entitiesList = [
  User,
  Follow,
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

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const sqlitePath = isVercel
  ? path.join('/tmp', 'echolet.sqlite')
  : path.join(__dirname, '../../echolet.sqlite');

export const AppDataSource = isPostgres
  ? new DataSource({
      type: 'postgres',
      url: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: true,
      logging: false,
      entities: entitiesList,
    })
  : new DataSource({
      type: 'better-sqlite3',
      database: sqlitePath,
      synchronize: true,
      logging: false,
      entities: entitiesList,
    });

let initPromise: Promise<DataSource> | null = null;

export const connectDatabase = async (): Promise<DataSource> => {
  try {
    if (AppDataSource.isInitialized) {
      return AppDataSource;
    }
    if (!initPromise) {
      initPromise = AppDataSource.initialize()
        .then((ds) => {
          const dbType = isPostgres ? 'PostgreSQL' : `Local SQLite (${sqlitePath})`;
          console.log(`${dbType} database connected successfully.`);
          return ds;
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

