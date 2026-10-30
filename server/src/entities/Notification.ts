import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export type NotificationType =
  | 'follow'
  | 'follow_request'
  | 'follow_accept'
  | 'like'
  | 'comment'
  | 'missed_call';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entityType?: 'post' | 'reel' | 'comment' | 'user' | 'follow_request' | 'story' | 'call';

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityId?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  requestStatus?: 'pending' | 'accepted' | 'declined' | 'cancelled';

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @CreateDateColumn()
  createdAt: Date;
}
