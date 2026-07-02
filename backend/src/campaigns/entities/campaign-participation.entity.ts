import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from './campaign.entity';

export enum ParticipationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('campaign_participations')
@Unique('UQ_user_campaign', ['userId', 'campaignId'])
@Index(['status', 'createdAt'])
@Index(['userId', 'status'])
@Index(['campaignId', 'status'])
@Index(['startTime', 'endTime'])
export class CampaignParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    default: ParticipationStatus.PENDING,
  })
  status: ParticipationStatus;

  @Column({ name: 'earnings_usd', type: 'decimal', precision: 10, scale: 2, default: 0 })
  earningsUSD: number;

  @Column({ name: 'completion_proof', type: 'json', nullable: true })
  completionProof?: {
    screenshots?: string[];
    videoUrl?: string;
    socialPostUrl?: string;
    description?: string;
    submittedAt?: Date;
  };

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'duration_actual_minutes', type: 'integer', nullable: true })
  durationActualMinutes?: number;

  @Column({ name: 'progress_percentage', type: 'integer', default: 0 })
  progressPercentage: number;

  @Column({ name: 'milestones_completed', type: 'json', nullable: true })
  milestonesCompleted?: string[];

  @Column({ name: 'payment_processed', default: false })
  paymentProcessed: boolean;

  @Column({ name: 'payment_processed_at', type: 'timestamp', nullable: true })
  paymentProcessedAt?: Date;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.participations, { nullable: false })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  // Virtual properties
  get isActive(): boolean {
    return this.status === ParticipationStatus.ACTIVE;
  }

  get isCompleted(): boolean {
    return this.status === ParticipationStatus.COMPLETED;
  }

  get isPending(): boolean {
    return this.status === ParticipationStatus.PENDING;
  }

  get timeRemaining(): number | null {
    if (!this.endTime) return null;
    const now = new Date();
    const remaining = this.endTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / (1000 * 60))); // minutes
  }

  get isExpired(): boolean {
    if (!this.endTime) return false;
    return new Date() > this.endTime;
  }

  get hasEarnings(): boolean {
    return Number(this.earningsUSD) > 0;
  }

  get actualDurationHours(): number | null {
    if (!this.startTime || !this.endTime) return null;
    const diff = this.endTime.getTime() - this.startTime.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // hours with 2 decimal precision
  }

  // Methods
  start(): void {
    if (this.status === ParticipationStatus.PENDING) {
      this.status = ParticipationStatus.ACTIVE;
      this.startTime = new Date();
    }
  }

  complete(proof?: any): void {
    if (this.status === ParticipationStatus.ACTIVE) {
      this.status = ParticipationStatus.COMPLETED;
      this.endTime = new Date();
      this.progressPercentage = 100;
      if (proof) {
        this.completionProof = {
          ...proof,
          submittedAt: new Date(),
        };
      }
      if (this.startTime && this.endTime) {
        this.durationActualMinutes = Math.floor(
          (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60)
        );
      }
    }
  }

  cancel(reason?: string): void {
    if ([ParticipationStatus.PENDING, ParticipationStatus.ACTIVE].includes(this.status)) {
      this.status = ParticipationStatus.CANCELLED;
      this.rejectionReason = reason;
      this.endTime = new Date();
    }
  }

  approve(earnings: number, notes?: string): void {
    if (this.status === ParticipationStatus.COMPLETED) {
      this.earningsUSD = earnings;
      this.approvalNotes = notes;
      // Status remains COMPLETED but earnings are set
    }
  }

  reject(reason: string): void {
    if (this.status === ParticipationStatus.COMPLETED) {
      this.status = ParticipationStatus.REJECTED;
      this.rejectionReason = reason;
      this.earningsUSD = 0;
    }
  }

  markPaymentProcessed(): void {
    this.paymentProcessed = true;
    this.paymentProcessedAt = new Date();
  }

  updateProgress(percentage: number, milestones?: string[]): void {
    this.progressPercentage = Math.max(0, Math.min(100, percentage));
    if (milestones) {
      this.milestonesCompleted = milestones;
    }
  }

  // Response formatting
  toResponseObject() {
    return {
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      earningsUSD: Number(this.earningsUSD),
      completionProof: this.completionProof,
      approvalNotes: this.approvalNotes,
      rejectionReason: this.rejectionReason,
      durationActualMinutes: this.durationActualMinutes,
      progressPercentage: this.progressPercentage,
      milestonesCompleted: this.milestonesCompleted,
      paymentProcessed: this.paymentProcessed,
      paymentProcessedAt: this.paymentProcessedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      isCompleted: this.isCompleted,
      isPending: this.isPending,
      timeRemaining: this.timeRemaining,
      isExpired: this.isExpired,
      hasEarnings: this.hasEarnings,
      actualDurationHours: this.actualDurationHours,
    };
  }
}