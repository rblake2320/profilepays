import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  token: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false, name: 'is_revoked' })
  isRevoked: boolean;

  @Column({ nullable: true, name: 'revoked_at', type: 'timestamp' })
  revokedAt?: Date;

  @Column({ nullable: true, name: 'user_agent', length: 500 })
  userAgent?: string;

  @Column({ nullable: true, name: 'ip_address', length: 45 })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}