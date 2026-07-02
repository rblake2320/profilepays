import { DataSource } from 'typeorm';
import { Campaign, CampaignStatus, CampaignCategory, SocialNetwork } from '../../campaigns/entities/campaign.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export async function seedCampaigns(dataSource: DataSource): Promise<void> {
  const campaignRepository = dataSource.getRepository(Campaign);
  const userRepository = dataSource.getRepository(User);

  // Check if campaigns already exist
  const existingCampaigns = await campaignRepository.count();
  if (existingCampaigns > 0) {
    console.log('Campaigns already seeded');
    return;
  }

  // Create test advertiser if doesn't exist
  let advertiser = await userRepository.findOne({
    where: { email: 'advertiser@example.com' }
  });

  if (!advertiser) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    advertiser = userRepository.create({
      email: 'advertiser@example.com',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'Advertiser',
      userRole: UserRole.ADVERTISER,
      isVerified: true,
      isActive: true,
    });
    advertiser = await userRepository.save(advertiser);
  }

  // Sample campaigns data
  const campaignsData = [
    {
      title: 'Nike Air Max Promotion',
      description: 'Create an Instagram story showcasing your new Nike Air Max sneakers. Share your unboxing experience and style them with your favorite outfit!',
      brandName: 'Nike',
      brandLogo: 'https://logo.clearbit.com/nike.com',
      brandColor: '#FF6B00',
      payoutUSD: 25.00,
      durationMinutes: 30,
      category: CampaignCategory.LIFESTYLE,
      network: SocialNetwork.INSTAGRAM,
      featured: true,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 100,
      requirements: {
        minFollowers: 1000,
        minAge: 18,
        verificationRequired: true,
      },
      campaignUrl: 'https://nike.com/air-max',
      instructions: 'Post an Instagram story featuring the Nike Air Max. Tag @nike and use #NikeAirMax #JustDoIt',
      tags: ['fashion', 'sneakers', 'lifestyle', 'instagram'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      totalBudget: 2500,
      advertiserId: advertiser.id,
    },
    {
      title: 'Starbucks Coffee Challenge',
      description: 'Visit your local Starbucks and try the new seasonal drink. Share a TikTok video of your reaction!',
      brandName: 'Starbucks',
      brandLogo: 'https://logo.clearbit.com/starbucks.com',
      brandColor: '#00704A',
      payoutUSD: 15.00,
      durationMinutes: 45,
      category: CampaignCategory.LIFESTYLE,
      network: SocialNetwork.TIKTOK,
      featured: true,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 200,
      requirements: {
        minFollowers: 500,
        minAge: 16,
        verificationRequired: false,
      },
      instructions: 'Create a TikTok video trying the new seasonal drink. Tag @starbucks and use #StarbucksChallenge',
      tags: ['coffee', 'drinks', 'lifestyle', 'tiktok'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      totalBudget: 3000,
      advertiserId: advertiser.id,
    },
    {
      title: 'PlayStation Game Review',
      description: 'Play the latest PlayStation exclusive for 2 hours and create a YouTube review video sharing your thoughts and gameplay highlights.',
      brandName: 'PlayStation',
      brandLogo: 'https://logo.clearbit.com/playstation.com',
      brandColor: '#003791',
      payoutUSD: 75.00,
      durationMinutes: 120,
      category: CampaignCategory.GAMING,
      network: SocialNetwork.YOUTUBE,
      featured: true,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 50,
      requirements: {
        minFollowers: 2000,
        minAge: 18,
        verificationRequired: true,
      },
      campaignUrl: 'https://playstation.com',
      instructions: 'Create a 10-15 minute YouTube review video. Include gameplay footage and honest opinions.',
      tags: ['gaming', 'playstation', 'review', 'youtube'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      totalBudget: 3750,
      approvalRequired: true,
      advertiserId: advertiser.id,
    },
    {
      title: 'Amazon Prime Benefits',
      description: 'Create content showcasing the benefits of Amazon Prime membership. Focus on fast delivery, Prime Video, or Prime Music.',
      brandName: 'Amazon Prime',
      brandLogo: 'https://logo.clearbit.com/amazon.com',
      brandColor: '#FF9900',
      payoutUSD: 30.00,
      durationMinutes: 60,
      category: CampaignCategory.SHOPPING,
      network: SocialNetwork.INSTAGRAM,
      featured: false,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 150,
      requirements: {
        minFollowers: 1500,
        minAge: 18,
        verificationRequired: true,
      },
      instructions: 'Create an Instagram post or reel highlighting Amazon Prime benefits. Use #AmazonPrime',
      tags: ['shopping', 'amazon', 'prime', 'benefits'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      totalBudget: 4500,
      advertiserId: advertiser.id,
    },
    {
      title: 'Spotify Playlist Creation',
      description: 'Create and share a themed Spotify playlist with at least 20 songs. Share it on your social media platforms.',
      brandName: 'Spotify',
      brandLogo: 'https://logo.clearbit.com/spotify.com',
      brandColor: '#1DB954',
      payoutUSD: 20.00,
      durationMinutes: 90,
      category: CampaignCategory.ENTERTAINMENT,
      network: SocialNetwork.TWITTER,
      featured: false,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 75,
      requirements: {
        minFollowers: 800,
        minAge: 16,
        verificationRequired: false,
      },
      instructions: 'Create a themed playlist and share on Twitter with playlist link. Use #SpotifyPlaylist',
      tags: ['music', 'spotify', 'playlist', 'entertainment'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-08-31'),
      totalBudget: 1500,
      advertiserId: advertiser.id,
    },
    {
      title: 'Tesla Model 3 Test Drive',
      description: 'Schedule and complete a Tesla Model 3 test drive. Share your experience on LinkedIn with professional insights.',
      brandName: 'Tesla',
      brandLogo: 'https://logo.clearbit.com/tesla.com',
      brandColor: '#CC0000',
      payoutUSD: 100.00,
      durationMinutes: 180,
      category: CampaignCategory.TECHNOLOGY,
      network: SocialNetwork.LINKEDIN,
      featured: true,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 25,
      requirements: {
        minFollowers: 500,
        minAge: 25,
        verificationRequired: true,
        targetCountries: ['US', 'CA'],
      },
      campaignUrl: 'https://tesla.com/model3',
      instructions: 'Write a professional LinkedIn post about your Tesla test drive experience. Include photos if possible.',
      tags: ['tesla', 'electric-vehicle', 'technology', 'linkedin', 'automotive'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      totalBudget: 2500,
      approvalRequired: true,
      advertiserId: advertiser.id,
    },
    {
      title: 'Duolingo Language Challenge',
      description: 'Complete a 7-day Duolingo streak learning a new language. Share your progress on social media.',
      brandName: 'Duolingo',
      brandLogo: 'https://logo.clearbit.com/duolingo.com',
      brandColor: '#58CC02',
      payoutUSD: 12.00,
      durationMinutes: 1680, // 7 days * 4 hours per day
      category: CampaignCategory.EDUCATION,
      featured: false,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 300,
      requirements: {
        minAge: 16,
        verificationRequired: false,
      },
      instructions: 'Complete 7 consecutive days of Duolingo lessons. Share progress screenshots.',
      tags: ['education', 'language', 'duolingo', 'learning'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      totalBudget: 3600,
      advertiserId: advertiser.id,
    },
    {
      title: 'Discord Community Engagement',
      description: 'Join our Discord server and actively participate in discussions for a week. Help new members and share gaming tips.',
      brandName: 'GameHub Community',
      brandColor: '#5865F2',
      payoutUSD: 18.00,
      durationMinutes: 420, // 7 hours spread over a week
      category: CampaignCategory.GAMING,
      network: SocialNetwork.DISCORD,
      featured: false,
      status: CampaignStatus.ACTIVE,
      maxParticipants: 100,
      requirements: {
        minAge: 18,
        verificationRequired: true,
      },
      instructions: 'Join our Discord server and be an active community member. Help newcomers and participate in gaming discussions.',
      tags: ['gaming', 'discord', 'community', 'engagement'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      totalBudget: 1800,
      advertiserId: advertiser.id,
    },
  ];

  // Create campaigns
  for (const campaignData of campaignsData) {
    const campaign = campaignRepository.create(campaignData);
    await campaignRepository.save(campaign);
  }

  console.log(`Seeded ${campaignsData.length} campaigns successfully`);
}