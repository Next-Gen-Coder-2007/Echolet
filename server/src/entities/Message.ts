import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export interface MessageReactionItem {
  emoji: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  createdAt?: string;
}

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

  @Column({ type: 'varchar', length: 30, default: 'text' })
  messageType:
    | 'text'
    | 'image'
    | 'video'
    | 'document'
    | 'poll'
    | 'voice'
    | 'audio'
    | 'reel'
    | 'post'
    | 'story_reply'
    | 'system';

  @Column({ type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fileSize?: string;

  @Column({ type: 'simple-json', nullable: true })
  poll?: {
    question: string;
    options: { id: string; text: string; voterIds: string[] }[];
    expiresAt?: string | null;
  } | null;

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

  @Column({ type: 'simple-json', nullable: true })
  story?: {
    id: string;
    mediaType: 'image' | 'video' | 'text';
    mediaUrl?: string;
    duration?: number;
    content?: string;
    backgroundColor?: string;
    fontStyle?: string;
    expiresAt: string;
    authorName?: string;
    authorUsername?: string;
    authorAvatar?: string;
  } | null;

  @Column({ type: 'boolean', default: false })
  isForwarded: boolean;

  @Column({ type: 'boolean', default: false })
  isDeletedForEveryone: boolean;

  @Column({ type: 'simple-json', nullable: true })
  reactions?: MessageReactionItem[];

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
