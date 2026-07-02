import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Participation } from './participation.entity';

export enum UserType {
  MEMBER = 'member',
  ADVERTISER = 'advertiser',
  ADMIN = 'admin',
}

export enum SubscriptionTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ELITE = 'elite',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  // Use varchar for cross-DB compatibility (enum not supported in SQLite)
  @Column({ name: 'user_type', type: 'varchar', length: 20 })
  userType: UserType;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'subscription_tier',
    type: 'varchar',
    length: 20,
    default: SubscriptionTier.BASIC,
    nullable: true,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ name: 'paypal_email', nullable: true })
  paypalEmail: string;

  @Column({ name: 'wallet_balance', type: 'real', default: 0 })
  walletBalance: number;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @OneToMany(() => Campaign, (campaign) => campaign.advertiser)
  campaigns: Campaign[];

  @OneToMany(() => Participation, (participation) => participation.member)
  participations: Participation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
