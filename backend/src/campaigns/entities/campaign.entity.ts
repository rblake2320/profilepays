import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignParticipation } from './campaign-participation.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignCategory {
  SOCIAL_MEDIA = 'social_media',
  GAMING = 'gaming',
  SHOPPING = 'shopping',
  LIFESTYLE = 'lifestyle',
  FINANCE = 'finance',
  HEALTH = 'health',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  TECHNOLOGY = 'technology',
  TRAVEL = 'travel',
  OTHER = 'other',
}

export enum SocialNetwork {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  SNAPCHAT = 'snapchat',
  PINTEREST = 'pinterest',
  TWITCH = 'twitch',
  DISCORD = 'discord',
}

@Entity('campaigns')
@Index(['status', 'featured', 'createdAt'])
@Index(['category', 'status'])
@Index(['network', 'status'])
@Index(['payoutUSD', 'status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'brand_name', length: 255 })
  brandName: string;

  @Column({ name: 'brand_logo', nullable: true })
  brandLogo?: string;

  @Column({ name: 'brand_color', length: 7, default: '#000000' })
  brandColor: string;

  @Column({ name: 'payout_usd', type: 'decimal', precision: 10, scale: 2 })
  payoutUSD: number;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: CampaignCategory,
    default: CampaignCategory.OTHER,
  })
  category: CampaignCategory;

  @Column({
    type: 'enum',
    enum: SocialNetwork,
    nullable: true,
  })
  network?: SocialNetwork;

  @Column({ default: false })
  featured: boolean;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ name: 'max_participants', type: 'integer', nullable: true })
  maxParticipants?: number;

  @Column({ name: 'current_participants', type: 'integer', default: 0 })
  currentParticipants: number;

  @Column({ name: 'requirements', type: 'json', nullable: true })
  requirements?: {
    minFollowers?: number;
    minAge?: number;
    maxAge?: number;
    targetCountries?: string[];
    targetGenders?: string[];
    verificationRequired?: boolean;
  };

  @Column({ name: 'campaign_url', nullable: true })
  campaignUrl?: string;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions?: string;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ name: 'total_budget', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalBudget?: number;

  @Column({ name: 'spent_budget', type: 'decimal', precision: 12, scale: 2, default: 0 })
  spentBudget: number;

  @Column({ name: 'approval_required', default: false })
  approvalRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'advertiser_id' })
  advertiser: User;

  @Column({ name: 'advertiser_id' })
  advertiserId: string;

  @OneToMany(() => CampaignParticipation, (participation) => participation.campaign)
  participations: CampaignParticipation[];

  // Virtual properties
  get isFull(): boolean {
    return this.maxParticipants ? this.currentParticipants >= this.maxParticipants : false;
  }

  get isActive(): boolean {
    return this.status === CampaignStatus.ACTIVE;
  }

  get isExpired(): boolean {
    return this.endDate ? new Date() > this.endDate : false;
  }

  get spotsRemaining(): number | null {
    return this.maxParticipants ? this.maxParticipants - this.currentParticipants : null;
  }

  get budgetRemaining(): number | null {
    return this.totalBudget ? this.totalBudget - this.spentBudget : null;
  }

  // Methods
  canUserJoin(user: User): { canJoin: boolean; reason?: string } {
    if (!this.isActive) {
      return { canJoin: false, reason: 'Campaign is not active' };
    }

    if (this.isExpired) {
      return { canJoin: false, reason: 'Campaign has expired' };
    }

    if (this.isFull) {
      return { canJoin: false, reason: 'Campaign is full' };
    }

    if (this.advertiserId === user.id) {
      return { canJoin: false, reason: 'Cannot join your own campaign' };
    }

    // Check requirements if specified
    if (this.requirements) {
      if (this.requirements.verificationRequired && !user.isVerified) {
        return { canJoin: false, reason: 'Email verification required' };
      }

      // Age requirements
      if (user.dateOfBirth) {
        const age = Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (this.requirements.minAge && age < this.requirements.minAge) {
          return { canJoin: false, reason: `Minimum age requirement: ${this.requirements.minAge}` };
        }
        if (this.requirements.maxAge && age > this.requirements.maxAge) {
          return { canJoin: false, reason: `Maximum age requirement: ${this.requirements.maxAge}` };
        }
      }
    }

    return { canJoin: true };
  }

  // Response formatting
  toResponseObject() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      brandName: this.brandName,
      brandLogo: this.brandLogo,
      brandColor: this.brandColor,
      payoutUSD: Number(this.payoutUSD),
      durationMinutes: this.durationMinutes,
      category: this.category,
      network: this.network,
      featured: this.featured,
      status: this.status,
      maxParticipants: this.maxParticipants,
      currentParticipants: this.currentParticipants,
      spotsRemaining: this.spotsRemaining,
      requirements: this.requirements,
      campaignUrl: this.campaignUrl,
      instructions: this.instructions,
      tags: this.tags,
      startDate: this.startDate,
      endDate: this.endDate,
      totalBudget: this.totalBudget ? Number(this.totalBudget) : null,
      spentBudget: Number(this.spentBudget),
      budgetRemaining: this.budgetRemaining ? Number(this.budgetRemaining) : null,
      approvalRequired: this.approvalRequired,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isFull: this.isFull,
      isActive: this.isActive,
      isExpired: this.isExpired,
    };
  }
}