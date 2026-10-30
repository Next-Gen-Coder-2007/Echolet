import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { getDateColumnType } from '../config/columnTypes';

export interface StoryViewerItem {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  viewedAt: string;
}

export interface StoryLikeItem {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  likedAt: string;
}

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  mediaUrl?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'image' })
  mediaType: 'image' | 'video' | 'text';

  @Column({ type: 'float', nullable: true })
  duration?: number | null;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  backgroundColor?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'modern' })
  fontStyle?: string | null;

  @Column({ type: 'int', default: 0 })
  viewsCount: number;

  @Column({ type: 'simple-json', nullable: true })
  viewers?: StoryViewerItem[] | null;

  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'simple-json', nullable: true })
  likes?: StoryLikeItem[] | null;

  @Column({ type: getDateColumnType() })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
