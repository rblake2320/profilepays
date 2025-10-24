import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignParticipation } from './campaign-participation.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'sponsored_image_url' })
  sponsoredImageUrl: string;

  @Column({ name: 'target_link', nullable: true })
  targetLink: string;

  @Column({ type: 'simple-json', name: 'target_audience' })
  targetAudience: {
    ageRange?: string[];
    gender?: string[];
    interests?: string[];
    locations?: string[];
    minFollowers?: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'payout_per_user' })
  payoutPerUser: number;

  @Column({ type: 'int', name: 'max_participants', nullable: true })
  maxParticipants: number;

  @Column({ type: 'int', name: 'current_participants', default: 0 })
  currentParticipants: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_spent', default: 0 })
  totalSpent: number;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'int', name: 'minimum_duration_hours', default: 24 })
  minimumDurationHours: number;

  @Column({ type: 'simple-json', nullable: true })
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    engagement?: number;
  };

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'business_id' })
  business: User;

  @OneToMany(() => CampaignParticipation, (participation) => participation.campaign)
  participations: CampaignParticipation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
