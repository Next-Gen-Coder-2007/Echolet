import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../entities/User';
import { Follow } from '../entities/Follow';
import { Message } from '../entities/Message';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const isPostgres =
  databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://');

export const AppDataSource = isPostgres
  ? new DataSource({
      type: 'postgres',
      url: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: true,
      logging: false,
      entities: [User, Follow, Message],
    })
  : new DataSource({
      type: 'better-sqlite3',
      database: path.join(__dirname, '../../echolet.sqlite'),
      synchronize: true,
      logging: false,
      entities: [User, Follow, Message],
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
