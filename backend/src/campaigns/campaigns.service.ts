import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository, FindOptionsWhere } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CampaignParticipation, ParticipationStatus } from './entities/campaign-participation.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { JoinCampaignDto } from './dto/join-campaign.dto';
import { CompleteCampaignDto } from './dto/complete-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignParticipation)
    private participationRepository: Repository<CampaignParticipation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, advertiserId: string): Promise<Campaign> {
    // Verify user is an advertiser
    const advertiser = await this.userRepository.findOne({
      where: { id: advertiserId, isActive: true }
    });

    if (!advertiser) {
      throw new NotFoundException('Advertiser not found');
    }

    if (advertiser.userRole !== UserRole.ADVERTISER && advertiser.userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Only advertisers can create campaigns');
    }

    // Validate dates if provided
    if (createCampaignDto.startDate && createCampaignDto.endDate) {
      const startDate = new Date(createCampaignDto.startDate);
      const endDate = new Date(createCampaignDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      if (startDate < new Date()) {
        throw new BadRequestException('Start date cannot be in the past');
      }
    }

    // Validate budget vs payout
    if (createCampaignDto.totalBudget && createCampaignDto.maxParticipants) {
      const maxPotentialEarnings = createCampaignDto.payoutUSD * createCampaignDto.maxParticipants;
      if (createCampaignDto.totalBudget < maxPotentialEarnings) {
        throw new BadRequestException('Total budget insufficient for maximum participants');
      }
    }

    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      advertiserId,
      advertiser,
      startDate: createCampaignDto.startDate ? new Date(createCampaignDto.startDate) : undefined,
      endDate: createCampaignDto.endDate ? new Date(createCampaignDto.endDate) : undefined,
    });

    return this.campaignRepository.save(campaign);
  }

  async findAll(filterDto: CampaignFilterDto) {
    const {
      search,
      category,
      network,
      status,
      minPayout,
      maxPayout,
      minDuration,
      maxDuration,
      featured,
      hasSpots,
      tags,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const offset = (page - 1) * limit;

    const queryBuilder = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.advertiser', 'advertiser')
      .select([
        'campaign',
        'advertiser.id',
        'advertiser.firstName',
        'advertiser.lastName',
        'advertiser.profileImage',
      ]);

    // Text search
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(campaign.title) LIKE LOWER(:search) OR LOWER(campaign.description) LIKE LOWER(:search) OR LOWER(campaign.brandName) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere('campaign.category = :category', { category });
    }

    // Network filter
    if (network) {
      queryBuilder.andWhere('campaign.network = :network', { network });
    }

    // Status filter (default to active for public listings)
    if (status) {
      queryBuilder.andWhere('campaign.status = :status', { status });
    } else {
      queryBuilder.andWhere('campaign.status = :status', { status: CampaignStatus.ACTIVE });
    }

    // Payout range
    if (minPayout !== undefined) {
      queryBuilder.andWhere('campaign.payoutUSD >= :minPayout', { minPayout });
    }
    if (maxPayout !== undefined) {
      queryBuilder.andWhere('campaign.payoutUSD <= :maxPayout', { maxPayout });
    }

    // Duration range
    if (minDuration !== undefined) {
      queryBuilder.andWhere('campaign.durationMinutes >= :minDuration', { minDuration });
    }
    if (maxDuration !== undefined) {
      queryBuilder.andWhere('campaign.durationMinutes <= :maxDuration', { maxDuration });
    }

    // Featured filter
    if (featured !== undefined) {
      queryBuilder.andWhere('campaign.featured = :featured', { featured });
    }

    // Has spots available
    if (hasSpots) {
      queryBuilder.andWhere(
        '(campaign.maxParticipants IS NULL OR campaign.currentParticipants < campaign.maxParticipants)'
      );
    }

    // Tags filter
    if (tags && tags.length > 0) {
      queryBuilder.andWhere('campaign.tags && :tags', { tags });
    }

    // Not expired
    queryBuilder.andWhere(
      '(campaign.endDate IS NULL OR campaign.endDate > :now)',
      { now: new Date() }
    );

    // Sorting
    const allowedSortFields = ['createdAt', 'payoutUSD', 'durationMinutes', 'title', 'endDate'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`campaign.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Featured campaigns first if not specifically filtered
    if (featured === undefined) {
      queryBuilder.addOrderBy('campaign.featured', 'DESC');
    }

    // Pagination
    queryBuilder.skip(offset).take(limit);

    const [campaigns, total] = await queryBuilder.getManyAndCount();

    return {
      data: campaigns.map(campaign => campaign.toResponseObject()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<any> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['advertiser', 'participations', 'participations.user'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const response = {
      ...campaign.toResponseObject(),
      advertiser: {
        id: campaign.advertiser.id,
        firstName: campaign.advertiser.firstName,
        lastName: campaign.advertiser.lastName,
        profileImage: campaign.advertiser.profileImage,
      },
    };

    // Add user-specific data if user is provided
    const extendedResponse = {
      ...response,
      userParticipation: null as any,
      eligibility: null as any,
    };

    if (userId) {
      const userParticipation = campaign.participations.find(p => p.userId === userId);
      extendedResponse.userParticipation = userParticipation?.toResponseObject() || null;

      // Check if user can join
      if (!userParticipation) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          extendedResponse.eligibility = campaign.canUserJoin(user);
        }
      }
    }

    return extendedResponse;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto, advertiserId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, advertiserId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found or you do not have permission to update it');
    }

    // Validate status transitions
    if (updateCampaignDto.status && campaign.status !== updateCampaignDto.status) {
      this.validateStatusTransition(campaign.status, updateCampaignDto.status);
    }

    // Validate dates if provided
    if (updateCampaignDto.startDate && updateCampaignDto.endDate) {
      const startDate = new Date(updateCampaignDto.startDate);
      const endDate = new Date(updateCampaignDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    Object.assign(campaign, {
      ...updateCampaignDto,
      startDate: updateCampaignDto.startDate ? new Date(updateCampaignDto.startDate) : campaign.startDate,
      endDate: updateCampaignDto.endDate ? new Date(updateCampaignDto.endDate) : campaign.endDate,
    });

    return this.campaignRepository.save(campaign);
  }

  async remove(id: string, advertiserId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, advertiserId },
      relations: ['participations'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found or you do not have permission to delete it');
    }

    // Check if campaign has active participations
    const activeParticipations = campaign.participations.filter(
      p => p.status === ParticipationStatus.ACTIVE || p.status === ParticipationStatus.PENDING
    );

    if (activeParticipations.length > 0) {
      throw new BadRequestException('Cannot delete campaign with active participants');
    }

    await this.campaignRepository.remove(campaign);
  }

  async joinCampaign(campaignId: string, userId: string, joinDto: JoinCampaignDto): Promise<CampaignParticipation> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['participations'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can join
    const eligibility = campaign.canUserJoin(user);
    if (!eligibility.canJoin) {
      throw new BadRequestException(eligibility.reason);
    }

    // Insert participation and claim a spot atomically. The UQ_user_campaign
    // constraint rejects duplicate joins, and the guarded UPDATE prevents
    // overshooting maxParticipants under concurrent joins — if either fails,
    // the transaction rolls back both writes.
    return this.dataSource.transaction(async (manager) => {
      const participation = manager.create(CampaignParticipation, {
        campaignId,
        userId,
        status: campaign.approvalRequired ? ParticipationStatus.PENDING : ParticipationStatus.ACTIVE,
      });

      if (!campaign.approvalRequired) {
        participation.startTime = new Date();
        participation.endTime = new Date(Date.now() + campaign.durationMinutes * 60000);
      }

      let savedParticipation: CampaignParticipation;
      try {
        savedParticipation = await manager.save(participation);
      } catch (error: any) {
        if (error?.code === '23505') {
          // unique_violation on UQ_user_campaign
          throw new ConflictException('You have already joined this campaign');
        }
        throw error;
      }

      const claimed = await manager
        .createQueryBuilder()
        .update(Campaign)
        .set({ currentParticipants: () => 'current_participants + 1' })
        .where('id = :id', { id: campaignId })
        .andWhere('(max_participants IS NULL OR current_participants < max_participants)')
        .execute();

      if (!claimed.affected) {
        throw new BadRequestException('Campaign is full');
      }

      return savedParticipation;
    });
  }

  async completeCampaign(participationId: string, userId: string, completeDto: CompleteCampaignDto): Promise<CampaignParticipation> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId, userId },
      relations: ['campaign'],
    });

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    if (participation.status !== ParticipationStatus.ACTIVE) {
      throw new BadRequestException('Can only complete active participations');
    }

    participation.complete(completeDto.proof);

    // Calculate earnings (full payout for now, can be adjusted based on approval)
    participation.earningsUSD = participation.campaign.payoutUSD;

    return this.participationRepository.save(participation);
  }

  async getUserCampaigns(userId: string, status?: ParticipationStatus) {
    const whereClause: FindOptionsWhere<CampaignParticipation> = { userId };
    if (status) {
      whereClause.status = status;
    }

    const participations = await this.participationRepository.find({
      where: whereClause,
      relations: ['campaign', 'campaign.advertiser'],
      order: { createdAt: 'DESC' },
    });

    return participations.map(participation => ({
      participation: participation.toResponseObject(),
      campaign: {
        ...participation.campaign.toResponseObject(),
        advertiser: {
          id: participation.campaign.advertiser.id,
          firstName: participation.campaign.advertiser.firstName,
          lastName: participation.campaign.advertiser.lastName,
        },
      },
    }));
  }

  async getUserEarnings(userId: string) {
    const result = await this.participationRepository
      .createQueryBuilder('participation')
      .select('SUM(participation.earningsUSD)', 'totalEarnings')
      .addSelect('COUNT(*)', 'totalCampaigns')
      .addSelect('COUNT(CASE WHEN participation.status = :completed THEN 1 END)', 'completedCampaigns')
      .addSelect('COUNT(CASE WHEN participation.paymentProcessed = true THEN 1 END)', 'paidCampaigns')
      .addSelect('SUM(CASE WHEN participation.paymentProcessed = false AND participation.earningsUSD > 0 THEN participation.earningsUSD ELSE 0 END)', 'pendingEarnings')
      .where('participation.userId = :userId', { userId })
      .setParameter('completed', ParticipationStatus.COMPLETED)
      .getRawOne();

    return {
      totalEarnings: Number(result.totalEarnings) || 0,
      pendingEarnings: Number(result.pendingEarnings) || 0,
      totalCampaigns: Number(result.totalCampaigns) || 0,
      completedCampaigns: Number(result.completedCampaigns) || 0,
      paidCampaigns: Number(result.paidCampaigns) || 0,
    };
  }

  async getAdvertiserCampaigns(advertiserId: string, status?: CampaignStatus) {
    const whereClause: FindOptionsWhere<Campaign> = { advertiserId };
    if (status) {
      whereClause.status = status;
    }

    const campaigns = await this.campaignRepository.find({
      where: whereClause,
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });

    return campaigns.map(campaign => ({
      ...campaign.toResponseObject(),
      participationsCount: campaign.participations.length,
      activeParticipations: campaign.participations.filter(p => p.status === ParticipationStatus.ACTIVE).length,
      completedParticipations: campaign.participations.filter(p => p.status === ParticipationStatus.COMPLETED).length,
    }));
  }

  async getCampaignAnalytics(campaignId: string, advertiserId: string) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, advertiserId },
      relations: ['participations'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const participations = campaign.participations;

    const analytics = {
      campaign: campaign.toResponseObject(),
      totalParticipants: participations.length,
      activeParticipants: participations.filter(p => p.status === ParticipationStatus.ACTIVE).length,
      completedParticipants: participations.filter(p => p.status === ParticipationStatus.COMPLETED).length,
      cancelledParticipants: participations.filter(p => p.status === ParticipationStatus.CANCELLED).length,
      totalEarningsPaid: participations.reduce((sum, p) => sum + Number(p.earningsUSD), 0),
      averageCompletionTime: this.calculateAverageCompletionTime(participations),
      conversionRate: participations.length > 0 ?
        (participations.filter(p => p.status === ParticipationStatus.COMPLETED).length / participations.length) * 100 : 0,
    };

    return analytics;
  }

  // Utility methods
  private validateStatusTransition(currentStatus: CampaignStatus, newStatus: CampaignStatus): void {
    const validTransitions = {
      [CampaignStatus.DRAFT]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
      [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
      [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
      [CampaignStatus.COMPLETED]: [],
      [CampaignStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private calculateAverageCompletionTime(participations: CampaignParticipation[]): number | null {
    const completedParticipations = participations.filter(
      p => p.status === ParticipationStatus.COMPLETED && p.startTime && p.endTime
    );

    if (completedParticipations.length === 0) return null;

    const totalMinutes = completedParticipations.reduce((sum, p) => {
      const duration = p.endTime!.getTime() - p.startTime!.getTime();
      return sum + (duration / (1000 * 60)); // Convert to minutes
    }, 0);

    return Math.round(totalMinutes / completedParticipations.length);
  }

  // Scheduled tasks (to be called by cron jobs)
  async expireOldParticipations(): Promise<void> {
    await this.participationRepository.update(
      {
        status: ParticipationStatus.ACTIVE,
        endTime: LessThan(new Date()),
      },
      { status: ParticipationStatus.EXPIRED },
    );
  }

  async autoCompleteCampaigns(): Promise<void> {
    await this.campaignRepository.update(
      {
        status: CampaignStatus.ACTIVE,
        endDate: LessThan(new Date()),
      },
      { status: CampaignStatus.COMPLETED },
    );
  }
}