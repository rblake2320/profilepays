import assert from 'node:assert/strict';
import mockAds from '../src/data/mockAds';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
};

assert.equal(formatCurrency(250), '$250.00');
assert.equal(formatCurrency(-42), '-$42.00');
assert.equal(validateEmail('user@example.com'), true);
assert.equal(validateEmail('invalid-email'), false);
assert.equal(truncateText('Short text', 20), 'Short text');
assert.equal(
  truncateText('This is a very long text that should be truncated', 20),
  'This is a very long ...'
);

assert.equal(mockAds.length, 12);
assert.ok(mockAds.every(ad => ad.payout > 0));
