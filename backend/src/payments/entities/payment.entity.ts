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

export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  CAMPAIGN_BUDGET = 'campaign_budget',
  USER_PAYOUT = 'user_payout',
  REFUND = 'refund',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  type: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ name: 'provider_transaction_id', nullable: true })
  providerTransactionId: string;

  @Column({ name: 'provider_customer_id', nullable: true })
  providerCustomerId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
