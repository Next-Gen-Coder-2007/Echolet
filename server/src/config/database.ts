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
];

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
      database: path.join(__dirname, '../../echolet.sqlite'),
      synchronize: true,
      logging: false,
      entities: entitiesList,
    });

export const connectDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      const dbType = isPostgres ? 'PostgreSQL' : 'Local SQLite (better-sqlite3)';
      console.log(`${dbType} database connected successfully.`);
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};
