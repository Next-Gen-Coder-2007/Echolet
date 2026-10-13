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
import { ReelLike } from './ReelLike';

@Entity('reels')
export class Reel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  videoUrl: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl?: string | null;

  @Column({ type: 'text', default: '' })
  caption: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  audioTitle?: string | null;

  @Column({ type: 'float', nullable: true })
  duration?: number | null;

  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  commentsCount: number;

  @Column({ type: 'int', default: 0 })
  sharesCount: number;

  @Column({ type: 'int', default: 0 })
  viewsCount: number;

  @OneToMany(() => ReelLike, (like) => like.reel)
  likes: ReelLike[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
