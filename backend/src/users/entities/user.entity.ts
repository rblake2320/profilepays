import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

export enum UserRole {
  MEMBER = 'member',
  ADVERTISER = 'advertiser',
  ADMIN = 'admin',
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
    name: 'user_role',
  })
  userRole: UserRole;

  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;

  @Column({ name: 'phone_number', nullable: true, length: 20 })
  phoneNumber?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ nullable: true, name: 'email_verification_token' })
  @Exclude()
  emailVerificationToken?: string;

  @Column({
    nullable: true,
    name: 'email_verification_expires',
    type: 'timestamp',
  })
  @Exclude()
  emailVerificationExpires?: Date;

  @Column({ nullable: true, name: 'password_reset_token' })
  @Exclude()
  passwordResetToken?: string;

  @Column({
    nullable: true,
    name: 'password_reset_expires',
    type: 'timestamp',
  })
  @Exclude()
  passwordResetExpires?: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true, name: 'last_login_at', type: 'timestamp' })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany('Campaign', (campaign: any) => campaign.advertiser)
  campaigns: any[];

  @OneToMany('CampaignParticipation', (participation: any) => participation.user)
  participations: any[];

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  // Methods for safe user data
  toResponseObject() {
    const { passwordHash, emailVerificationToken, passwordResetToken, refreshTokens, ...user } = this;
    return user;
  }
}