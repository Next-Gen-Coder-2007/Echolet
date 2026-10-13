import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './Group';
import { User } from './User';

@Entity('group_messages')
export class GroupMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  senderId?: string;

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

  @Column({ type: 'simple-json', nullable: true })
  replyTo?: { id: string; senderId: string; senderName: string; content: string };

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

  @Column({ type: 'boolean', default: false })
  isDeletedForEveryone: boolean;

  @Column({ type: 'simple-json', nullable: true })
  deletedFor?: string[];

  @ManyToOne(() => Group, (group) => group.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender?: User;

  @CreateDateColumn()
  createdAt: Date;
}
