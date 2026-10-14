import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { ReelComment } from './ReelComment';

@Entity('reel_comment_reactions')
@Unique(['commentId', 'userId'])
export class ReelCommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  commentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  type: 'like' | 'dislike';

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ReelComment, (comment) => comment.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: ReelComment;

  @CreateDateColumn()
  createdAt: Date;
}
