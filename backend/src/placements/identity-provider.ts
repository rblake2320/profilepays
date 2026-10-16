import { ServiceUnavailableException } from '@nestjs/common';

// Provider implementations must authenticate callbacks and bind the provider's
// deduplicated payee subject to one account. User input is never verification.
export interface IdentityProvider {
  readonly name: string;
  createHostedVerification(userId: string): Promise<{ url: string }>;
  verifyCallback(
    rawBody: Buffer,
    signature: string
  ): Promise<{
    eventId: string;
    userId: string;
    subject: string;
    status: 'verified' | 'revoked';
    occurredAt: number;
  }>;
}

export class UnconfiguredIdentityProvider implements IdentityProvider {
  readonly name = 'unconfigured';
  async createHostedVerification(_userId: string): Promise<{ url: string }> {
    throw new ServiceUnavailableException(
      'Identity verification is not connected. Test credits only; real payouts are disabled.'
    );
  }
  async verifyCallback(_body: Buffer, _signature: string): Promise<never> {
    throw new ServiceUnavailableException('No identity provider is connected');
  }
}

export const identityStatus = Object.freeze({
  provider: 'unconfigured',
  status: 'not_verified',
  realPayoutsEnabled: false,
  message:
    'Test credits only. Legal/payee identity verification is not connected. Do not submit tax numbers or identity documents here.',
});
