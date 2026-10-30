import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { Reel } from './Reel';
import { getDateColumnType } from '../config/columnTypes';
import { ReelCommentReaction } from './ReelCommentReaction';

@Entity('reel_comments')
export class ReelComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reelId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  dislikesCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: getDateColumnType(), nullable: true })
  pinnedAt?: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reelId' })
  reel: Reel;

  @ManyToOne(() => ReelComment, (comment) => comment.replies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: ReelComment | null;

  @OneToMany(() => ReelComment, (comment) => comment.parent)
  replies?: ReelComment[];

  @OneToMany(() => ReelCommentReaction, (reaction) => reaction.comment)
  reactions?: ReelCommentReaction[];

  @CreateDateColumn()
  createdAt: Date;
}
