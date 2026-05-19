import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Campaign } from './campaign.entity';

export enum ParticipationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAID = 'paid',
}

@Entity('participations')
export class Participation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => User, (user) => user.participations)
  @JoinColumn({ name: 'member_id' })
  member: User;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.participations)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  // varchar for cross-DB compatibility
  @Column({ type: 'varchar', length: 20, default: ParticipationStatus.PENDING })
  status: ParticipationStatus;

  @Column({ name: 'proof_screenshot_url', nullable: true })
  proofScreenshotUrl: string;

  @Column({ name: 'payout_amount', type: 'real', nullable: true })
  payoutAmount: number;

  @Column({ name: 'platform', nullable: true })
  platform: string;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
