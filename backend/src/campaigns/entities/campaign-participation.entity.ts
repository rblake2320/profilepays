import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from './campaign.entity';

export enum ParticipationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

@Entity('campaign_participations')
export class CampaignParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => User, (user) => user.participations)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Campaign, (campaign) => campaign.participations)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    default: ParticipationStatus.PENDING,
  })
  status: ParticipationStatus;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  earnings: number;

  @Column({ name: 'profile_picture_snapshot', nullable: true })
  profilePictureSnapshot: string;

  @Column({ type: 'simple-json', nullable: true })
  metrics: {
    impressions?: number;
    clicks?: number;
    shareCount?: number;
  };

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'payment_date', type: 'timestamp', nullable: true })
  paymentDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
