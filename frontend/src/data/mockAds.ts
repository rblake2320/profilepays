export type AdCategory = 'Retail' | 'Tech' | 'Automotive' | 'Entertainment' | 'Finance';

export type MarketplaceAd = {
  id: string;
  title: string;
  category: AdCategory;
  payout: number;
  frequency: string;
};

const mockAds: MarketplaceAd[] = [
  { id: '1', title: 'Target Weekly Deals', category: 'Retail', payout: 12, frequency: '24h swap' },
  {
    id: '2',
    title: 'Spotify Premium Push',
    category: 'Entertainment',
    payout: 9,
    frequency: '48h swap',
  },
  {
    id: '3',
    title: 'Tesla Model Y Launch',
    category: 'Automotive',
    payout: 18,
    frequency: '72h swap',
  },
  {
    id: '4',
    title: 'Square Business Banking',
    category: 'Finance',
    payout: 15,
    frequency: '24h swap',
  },
  { id: '5', title: 'Best Buy Tech Week', category: 'Tech', payout: 10, frequency: '24h swap' },
  {
    id: '6',
    title: 'Nintendo Holiday Drop',
    category: 'Entertainment',
    payout: 11,
    frequency: '48h swap',
  },
  {
    id: '7',
    title: 'Ford Electric Fleet',
    category: 'Automotive',
    payout: 14,
    frequency: '72h swap',
  },
  {
    id: '8',
    title: 'Robinhood Learn & Earn',
    category: 'Finance',
    payout: 8,
    frequency: '24h swap',
  },
  {
    id: '9',
    title: 'Nike Sneaker Showcase',
    category: 'Retail',
    payout: 13,
    frequency: '24h swap',
  },
  { id: '10', title: 'Adobe Creative Cloud', category: 'Tech', payout: 16, frequency: '72h swap' },
  {
    id: '11',
    title: 'Paramount+ Originals',
    category: 'Entertainment',
    payout: 9,
    frequency: '48h swap',
  },
  {
    id: '12',
    title: 'Ally Savings Sprint',
    category: 'Finance',
    payout: 10,
    frequency: '24h swap',
  },
];

export default mockAds;
