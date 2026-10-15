import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { Comment } from './Comment';
import { PostLike } from './PostLike';
import { PostBookmark } from './PostBookmark';

export interface PollOptionItem {
  id: number;
  text: string;
  votes: number;
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  mediaUrls: string[] | null;

  @Column({ type: 'varchar', length: 30, default: 'text' })
  mediaType: 'text' | 'image' | 'video' | 'gif' | 'poll';

  @Column({ type: 'simple-json', nullable: true })
  pollOptions: PollOptionItem[] | null;

  @Column({
    type: process.env.DATABASE_URL?.trim().startsWith('postgres') ? 'timestamp' : 'datetime',
    nullable: true,
  })
  pollExpiresAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  commentsCount: number;

  @Column({ type: 'int', default: 0 })
  repostsCount: number;

  @Column({ type: 'int', default: 0 })
  bookmarksCount: number;

  @Column({ type: 'int', default: 0 })
  sharesCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @OneToMany(() => PostBookmark, (bookmark) => bookmark.post)
  bookmarks: PostBookmark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
