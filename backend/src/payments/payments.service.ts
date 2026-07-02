import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { User, SubscriptionTier } from '../database/entities/user.entity';

// Subscription tier pricing (in cents)
const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  [SubscriptionTier.BASIC]: 100,     // $1/mo
  [SubscriptionTier.STANDARD]: 500,  // $5/mo
  [SubscriptionTier.PREMIUM]: 1000,  // $10/mo
  [SubscriptionTier.ELITE]: 2500,    // $25/mo
};

// Transaction fee rates by tier
export const TRANSACTION_FEE_RATES: Record<SubscriptionTier, number> = {
  [SubscriptionTier.BASIC]: 0.07,    // 7%
  [SubscriptionTier.STANDARD]: 0.05, // 5%
  [SubscriptionTier.PREMIUM]: 0.03,  // 3%
  [SubscriptionTier.ELITE]: 0.01,    // 1%
};

export const PLATFORM_FEE_RATE = 0.07; // 7% from advertiser
export const MINIMUM_PAYOUT = 10;      // $10 minimum

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && stripeKey !== 'sk_test_fake_key') {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });
    }
  }

  async createPaymentIntent(
    advertiserId: string,
    amountUsd: number,
  ): Promise<{ clientSecret: string; platformFee: number; escrowAmount: number }> {
    if (!this.stripe) {
      throw new BadRequestException('Payment processing not configured');
    }

    const advertiser = await this.userRepository.findOneBy({ id: advertiserId });
    if (!advertiser) {
      throw new NotFoundException('Advertiser not found');
    }

    const platformFee = Math.round(amountUsd * PLATFORM_FEE_RATE * 100) / 100;
    const escrowAmount = amountUsd - platformFee;
    const amountCents = Math.round(amountUsd * 100);

    // Ensure Stripe customer exists
    let customerId = advertiser.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: advertiser.email,
        metadata: { userId: advertiser.id },
      });
      customerId = customer.id;
      advertiser.stripeCustomerId = customerId;
      await this.userRepository.save(advertiser);
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      metadata: {
        advertiserId,
        platformFee: platformFee.toString(),
        escrowAmount: escrowAmount.toString(),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      platformFee,
      escrowAmount,
    };
  }

  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    if (!this.stripe) {
      // In dev mode without Stripe, just update the tier
      await this.userRepository.update({ id: userId }, { subscriptionTier: tier });
      return { subscriptionId: `dev_sub_${tier}_${Date.now()}` };
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await this.userRepository.save(user);
    }

    // Create price on the fly (in production, use pre-created price IDs)
    const price = await this.stripe.prices.create({
      unit_amount: SUBSCRIPTION_PRICES[tier],
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: `ProfilePays ${tier} Plan` },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user tier
    await this.userRepository.update({ id: userId }, { subscriptionTier: tier });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || undefined,
    };
  }

  async requestPayout(userId: string): Promise<{ amount: number; message: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const balance = Number(user.walletBalance);
    if (balance < MINIMUM_PAYOUT) {
      throw new BadRequestException(
        `Minimum payout is $${MINIMUM_PAYOUT}. Current balance: $${balance.toFixed(2)}`,
      );
    }

    const feeRate = TRANSACTION_FEE_RATES[user.subscriptionTier || SubscriptionTier.BASIC];
    const fee = balance * feeRate;
    const netPayout = balance - fee;

    // In production: initiate Stripe payout or PayPal transfer here
    // For now, zero out the wallet and record the payout
    user.walletBalance = 0;
    await this.userRepository.save(user);

    return {
      amount: Math.round(netPayout * 100) / 100,
      message: `Payout of $${netPayout.toFixed(2)} initiated (fee: $${fee.toFixed(2)})`,
    };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!this.stripe) return;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return;

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment — fund escrow
        break;
      case 'invoice.payment_succeeded':
        // Handle subscription renewal
        break;
      default:
        break;
    }
  }

  getFeeInfo(): {
    platformFeeRate: number;
    minimumPayout: number;
    tierFees: Record<string, number>;
    subscriptionPrices: Record<string, number>;
  } {
    return {
      platformFeeRate: PLATFORM_FEE_RATE,
      minimumPayout: MINIMUM_PAYOUT,
      tierFees: TRANSACTION_FEE_RATES as Record<string, number>,
      subscriptionPrices: Object.fromEntries(
        Object.entries(SUBSCRIPTION_PRICES).map(([k, v]) => [k, v / 100]),
      ),
    };
  }
}
