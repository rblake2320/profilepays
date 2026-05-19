import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../database/entities/campaign.entity';
import { Participation, ParticipationStatus } from '../database/entities/participation.entity';
import { User, UserType } from '../database/entities/user.entity';

export interface CreateCampaignDto {
  title: string;
  description?: string;
  imageUrl?: string;
  budget: number;
  payoutPerSwap: number;
  durationHours: number;
  maxParticipants?: number;
  targetCountry?: string;
  targetState?: string;
  targetMinAge?: number;
  targetMaxAge?: number;
  targetMinFollowers?: number;
  targetPlatforms?: string[];
  industry?: string;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  status?: CampaignStatus;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(advertiserId: string, dto: CreateCampaignDto): Promise<Campaign> {
    if (dto.payoutPerSwap * (dto.maxParticipants || 1) > dto.budget) {
      // Allow creation but warn — budget validation
    }

    const campaign = this.campaignRepository.create({
      ...dto,
      advertiserId,
      status: CampaignStatus.DRAFT,
    });

    return this.campaignRepository.save(campaign);
  }

  async findAll(filters?: { status?: CampaignStatus; advertiserId?: string }): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.advertiser', 'advertiser')
      .select([
        'campaign',
        'advertiser.id',
        'advertiser.email',
        'advertiser.companyName',
        'advertiser.firstName',
        'advertiser.lastName',
      ]);

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }
    if (filters?.advertiserId) {
      query.andWhere('campaign.advertiserId = :advertiserId', { advertiserId: filters.advertiserId });
    }

    return query.orderBy('campaign.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['advertiser', 'participations'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async update(campaignId: string, advertiserId: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findById(campaignId);

    if (campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot update a completed or cancelled campaign');
    }

    Object.assign(campaign, dto);
    return this.campaignRepository.save(campaign);
  }

  async activate(campaignId: string, advertiserId: string): Promise<Campaign> {
    return this.update(campaignId, advertiserId, { status: CampaignStatus.ACTIVE });
  }

  async pause(campaignId: string, advertiserId: string): Promise<Campaign> {
    return this.update(campaignId, advertiserId, { status: CampaignStatus.PAUSED });
  }

  async end(campaignId: string, advertiserId: string): Promise<Campaign> {
    return this.update(campaignId, advertiserId, { status: CampaignStatus.COMPLETED });
  }

  // Member: join a campaign
  async participate(campaignId: string, memberId: string, platform: string): Promise<Participation> {
    const campaign = await this.findById(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    // Check if already participating
    const existing = await this.participationRepository.findOne({
      where: { campaignId, memberId },
    });
    if (existing) {
      throw new BadRequestException('Already participating in this campaign');
    }

    // Check max participants
    if (campaign.maxParticipants) {
      const count = await this.participationRepository.count({ where: { campaignId } });
      if (count >= campaign.maxParticipants) {
        throw new BadRequestException('Campaign is full');
      }
    }

    const participation = this.participationRepository.create({
      campaignId,
      memberId,
      platform,
      status: ParticipationStatus.ACTIVE,
      startedAt: new Date(),
      payoutAmount: campaign.payoutPerSwap,
    });

    return this.participationRepository.save(participation);
  }

  // Member: submit proof
  async submitProof(
    participationId: string,
    memberId: string,
    proofScreenshotUrl: string,
  ): Promise<Participation> {
    const participation = await this.participationRepository.findOneBy({ id: participationId });
    if (!participation) {
      throw new NotFoundException('Participation not found');
    }
    if (participation.memberId !== memberId) {
      throw new ForbiddenException('Not your participation');
    }
    if (participation.status !== ParticipationStatus.ACTIVE) {
      throw new BadRequestException('Participation is not active');
    }

    participation.proofScreenshotUrl = proofScreenshotUrl;
    participation.status = ParticipationStatus.COMPLETED;
    participation.completedAt = new Date();

    const saved = await this.participationRepository.save(participation);

    // Credit member wallet
    await this.userRepository.increment(
      { id: memberId },
      'walletBalance',
      Number(participation.payoutAmount),
    );

    // Debit campaign budget
    await this.campaignRepository.increment(
      { id: participation.campaignId },
      'budgetSpent',
      Number(participation.payoutAmount),
    );

    return saved;
  }

  async getMarketplace(): Promise<Campaign[]> {
    return this.findAll({ status: CampaignStatus.ACTIVE });
  }

  async getStats(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalPaidOut: number;
    totalParticipations: number;
  }> {
    const totalCampaigns = await this.campaignRepository.count();
    const activeCampaigns = await this.campaignRepository.count({
      where: { status: CampaignStatus.ACTIVE },
    });

    const result = await this.participationRepository
      .createQueryBuilder('p')
      .select('SUM(p.payoutAmount)', 'totalPaidOut')
      .addSelect('COUNT(p.id)', 'totalParticipations')
      .where('p.status IN (:...statuses)', {
        statuses: [ParticipationStatus.COMPLETED, ParticipationStatus.PAID],
      })
      .getRawOne();

    return {
      totalCampaigns,
      activeCampaigns,
      totalPaidOut: Number(result?.totalPaidOut || 0),
      totalParticipations: Number(result?.totalParticipations || 0),
    };
  }
}
