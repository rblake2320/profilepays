import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import {
  CampaignParticipation,
  ParticipationStatus,
} from './entities/campaign-participation.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignParticipation)
    private participationRepository: Repository<CampaignParticipation>,
    private usersService: UsersService,
  ) {}

  async create(
    businessId: string,
    createCampaignDto: CreateCampaignDto,
  ): Promise<Campaign> {
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      businessId,
    });

    return this.campaignRepository.save(campaign);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: CampaignStatus,
  ): Promise<{ data: Campaign[]; total: number }> {
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // By default, only show active campaigns to users
      where.status = CampaignStatus.ACTIVE;
    }

    const [data, total] = await this.campaignRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['business'],
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['business', 'participations'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async findByBusiness(businessId: string): Promise<Campaign[]> {
    return this.campaignRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    businessId: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.businessId !== businessId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    Object.assign(campaign, updateCampaignDto);
    return this.campaignRepository.save(campaign);
  }

  async updateStatus(
    id: string,
    status: CampaignStatus,
    businessId?: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (businessId && campaign.businessId !== businessId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    campaign.status = status;
    return this.campaignRepository.save(campaign);
  }

  async remove(id: string, businessId: string): Promise<void> {
    const campaign = await this.findOne(id);

    if (campaign.businessId !== businessId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    await this.campaignRepository.remove(campaign);
  }

  // Campaign Participation Methods
  async joinCampaign(
    campaignId: string,
    userId: string,
  ): Promise<CampaignParticipation> {
    const campaign = await this.findOne(campaignId);

    // Validate campaign status
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    // Check if already participating
    const existing = await this.participationRepository.findOne({
      where: { campaignId, userId },
    });

    if (existing) {
      throw new BadRequestException('Already participating in this campaign');
    }

    // Check max participants
    if (
      campaign.maxParticipants &&
      campaign.currentParticipants >= campaign.maxParticipants
    ) {
      throw new BadRequestException('Campaign is full');
    }

    // Check budget
    if (campaign.budget <= campaign.totalSpent) {
      throw new BadRequestException('Campaign budget exhausted');
    }

    // Create participation
    const participation = this.participationRepository.create({
      campaignId,
      userId,
      status: ParticipationStatus.PENDING,
      earnings: Number(campaign.payoutPerUser),
    });

    await this.participationRepository.save(participation);

    // Update campaign stats
    campaign.currentParticipants += 1;
    await this.campaignRepository.save(campaign);

    return participation;
  }

  async approveParticipation(
    participationId: string,
    businessId: string,
  ): Promise<CampaignParticipation> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId },
      relations: ['campaign'],
    });

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    if (participation.campaign.businessId !== businessId) {
      throw new ForbiddenException('Unauthorized');
    }

    participation.status = ParticipationStatus.ACTIVE;
    participation.startDate = new Date();

    return this.participationRepository.save(participation);
  }

  async completeParticipation(
    participationId: string,
  ): Promise<CampaignParticipation> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId },
      relations: ['campaign'],
    });

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    participation.status = ParticipationStatus.COMPLETED;
    participation.endDate = new Date();

    // Add earnings to user
    await this.usersService.addEarnings(
      participation.userId,
      Number(participation.earnings),
    );

    // Update campaign total spent
    participation.campaign.totalSpent =
      Number(participation.campaign.totalSpent) + Number(participation.earnings);
    await this.campaignRepository.save(participation.campaign);

    return this.participationRepository.save(participation);
  }

  async getUserParticipations(userId: string): Promise<CampaignParticipation[]> {
    return this.participationRepository.find({
      where: { userId },
      relations: ['campaign'],
      order: { createdAt: 'DESC' },
    });
  }
}
