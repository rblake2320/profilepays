import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Participation } from './participation.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'advertiser_id' })
  advertiserId: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'advertiser_id' })
  advertiser: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ type: 'real' })
  budget: number;

  @Column({ name: 'budget_spent', type: 'real', default: 0 })
  budgetSpent: number;

  @Column({ name: 'payout_per_swap', type: 'real' })
  payoutPerSwap: number;

  @Column({ name: 'duration_hours', type: 'int' })
  durationHours: number;

  @Column({ name: 'max_participants', type: 'int', nullable: true })
  maxParticipants: number;

  // varchar for cross-DB compatibility
  @Column({ type: 'varchar', length: 30, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  // Targeting
  @Column({ name: 'target_country', nullable: true })
  targetCountry: string;

  @Column({ name: 'target_state', nullable: true })
  targetState: string;

  @Column({ name: 'target_min_age', type: 'int', nullable: true })
  targetMinAge: number;

  @Column({ name: 'target_max_age', type: 'int', nullable: true })
  targetMaxAge: number;

  @Column({ name: 'target_min_followers', type: 'int', nullable: true })
  targetMinFollowers: number;

  @Column({ name: 'target_platforms', type: 'simple-array', nullable: true })
  targetPlatforms: string[];

  @Column({ name: 'industry', nullable: true })
  industry: string;

  @Column({ name: 'starts_at', nullable: true })
  startsAt: Date;

  @Column({ name: 'ends_at', nullable: true })
  endsAt: Date;

  @OneToMany(() => Participation, (participation) => participation.campaign)
  participations: Participation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
