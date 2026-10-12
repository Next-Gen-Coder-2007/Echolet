import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'uuid' })
  receiverId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  messageType: 'text' | 'image' | 'voice' | 'audio' | 'system';

  @Column({ type: 'text', nullable: true })
  audioUrl?: string;

  @Column({ type: 'float', nullable: true })
  audioDuration?: number;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 20, default: 'sent' })
  status: 'sent' | 'delivered' | 'read';

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ nullable: true })
  pinnedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  pinnedBy?: string;

  @Column({ type: 'simple-json', nullable: true })
  starredBy?: string[];

  @Column({ type: 'simple-json', nullable: true })
  replyTo?: { id: string; senderId: string; senderName: string; content: string };

  @Column({ type: 'boolean', default: false })
  isForwarded: boolean;

  @Column({ type: 'boolean', default: false })
  isDeletedForEveryone: boolean;

  @Column({ type: 'simple-json', nullable: true })
  deletedFor?: string[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @CreateDateColumn()
  createdAt: Date;
}
