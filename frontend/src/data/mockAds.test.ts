import { describe, it, expect } from 'vitest';
import mockAds from './mockAds';

describe('mockAds catalog', () => {
  it('contains the full set of demo campaigns', () => {
    expect(mockAds.length).toBe(12);
  });

  it('every ad has a positive payout and required display fields', () => {
    for (const ad of mockAds) {
      expect(ad.payout).toBeGreaterThan(0);
      expect(ad.id).toBeTruthy();
      expect(ad.title).toBeTruthy();
      expect(ad.frequency).toBeTruthy();
    }
  });
});
