import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { CampaignParticipation } from '../../campaigns/entities/campaign-participation.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

export enum UserType {
  MEMBER = 'member',
  BUSINESS = 'business',
  ADMIN = 'admin',
}

export enum SubscriptionTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.MEMBER,
    name: 'user_type',
  })
  userType: UserType;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'profile_picture_url', nullable: true })
  profilePictureUrl: string;

  @Column({ name: 'original_profile_picture_url', nullable: true })
  originalProfilePictureUrl: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.BASIC,
    name: 'subscription_tier',
  })
  subscriptionTier: SubscriptionTier;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'simple-json', nullable: true })
  interests: string[];

  @Column({ type: 'simple-json', nullable: true })
  demographics: {
    gender?: string;
    location?: string;
    ageRange?: string;
  };

  @Column({ name: 'total_earnings', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ name: 'available_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verification_token', nullable: true })
  @Exclude()
  emailVerificationToken: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'oauth_provider', nullable: true })
  oauthProvider: string;

  @Column({ name: 'oauth_id', nullable: true })
  oauthId: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ name: 'paypal_email', nullable: true })
  paypalEmail: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CampaignParticipation, (participation) => participation.user)
  participations: CampaignParticipation[];

  @OneToMany(() => Campaign, (campaign) => campaign.business)
  campaigns: Campaign[];
}
