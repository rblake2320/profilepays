import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  Payment,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
} from './entities/payment.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2024-12-18.acacia',
      },
    );
  }

  async createPaymentIntent(
    userId: string,
    amount: number,
    type: PaymentType,
    metadata?: Record<string, any>,
  ): Promise<{ clientSecret: string; payment: Payment }> {
    const user = await this.usersService.findOne(userId);

    // Create Stripe customer if doesn't exist
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await this.usersService.update(userId, {
        ...user,
        stripeCustomerId: customerId,
      } as any);
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: metadata || {},
    });

    // Save payment record
    const payment = this.paymentRepository.create({
      userId,
      type,
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      amount,
      currency: 'USD',
      providerTransactionId: paymentIntent.id,
      providerCustomerId: customerId,
      metadata,
    });

    await this.paymentRepository.save(payment);

    return {
      clientSecret: paymentIntent.client_secret!,
      payment,
    };
  }

  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret || '',
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { providerTransactionId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      payment.processedAt = new Date();
      await this.paymentRepository.save(payment);
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { providerTransactionId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      await this.paymentRepository.save(payment);
    }
  }

  async processPayout(
    userId: string,
    amount: number,
  ): Promise<Payment> {
    const user = await this.usersService.findOne(userId);

    if (Number(user.availableBalance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    if (!user.paypalEmail) {
      throw new BadRequestException('PayPal email not configured');
    }

    // Create payout record
    const payment = this.paymentRepository.create({
      userId,
      type: PaymentType.USER_PAYOUT,
      status: PaymentStatus.PROCESSING,
      provider: PaymentProvider.PAYPAL,
      amount,
      currency: 'USD',
      description: 'User earnings payout',
    });

    await this.paymentRepository.save(payment);

    try {
      // In production, integrate with PayPal API
      // For now, just mark as completed
      payment.status = PaymentStatus.COMPLETED;
      payment.processedAt = new Date();
      await this.paymentRepository.save(payment);

      // Deduct from user balance
      await this.usersService.deductBalance(userId, amount);

      return payment;
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = error.message;
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Payment[]; total: number }> {
    const [data, total] = await this.paymentRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return { data, total };
  }
}
