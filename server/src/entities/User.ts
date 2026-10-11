import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  birthday?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'text', nullable: true })
  bannerUrl?: string;

  @Column({ type: 'varchar', select: false, nullable: true })
  password?: string;

  @Column({ type: 'varchar', length: 120, nullable: true, select: false })
  googleId?: string;

  @Column({ nullable: true })
  lastSeen?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields() {
    if (this.username) {
      this.username = this.username.toLowerCase().trim();
    }
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
