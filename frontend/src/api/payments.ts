import apiClient from './client';
import { SubscriptionTier } from '../store/authSlice';

export interface FeeInfo {
  platformFeeRate: number;
  minimumPayout: number;
  tierFees: Record<string, number>;
  subscriptionPrices: Record<string, number>;
}

export const paymentsApi = {
  getFees: () =>
    apiClient.get<FeeInfo>('/payments/fees').then((r) => r.data),

  createPaymentIntent: (amount: number) =>
    apiClient
      .post<{ clientSecret: string; platformFee: number; escrowAmount: number }>(
        '/payments/intent',
        { amount },
      )
      .then((r) => r.data),

  subscribe: (tier: SubscriptionTier) =>
    apiClient
      .post<{ subscriptionId: string; clientSecret?: string }>('/payments/subscribe', { tier })
      .then((r) => r.data),

  requestPayout: () =>
    apiClient
      .post<{ amount: number; message: string }>('/payments/payout')
      .then((r) => r.data),
};
