import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignsService } from './campaigns.service';
import { Campaign, CampaignStatus, CampaignCategory } from './entities/campaign.entity';
import { CampaignParticipation, ParticipationStatus } from './entities/campaign-participation.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let campaignRepository: Repository<Campaign>;
  let participationRepository: Repository<CampaignParticipation>;
  let userRepository: Repository<User>;

  const mockCampaignRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
  };

  const mockParticipationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  // Transactional entity manager handed to dataSource.transaction callbacks
  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: (manager: typeof mockManager) => unknown) => cb(mockManager)),
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    userRole: UserRole.MEMBER,
    isVerified: true,
    isActive: true,
    dateOfBirth: new Date('1990-01-01'),
  } as User;

  const mockAdvertiser: User = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'advertiser@example.com',
    firstName: 'Test',
    lastName: 'Advertiser',
    userRole: UserRole.ADVERTISER,
    isVerified: true,
    isActive: true,
  } as User;

  const mockCampaign: Campaign = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    title: 'Test Campaign',
    description: 'Test Description',
    brandName: 'Test Brand',
    payoutUSD: 25.00,
    durationMinutes: 30,
    category: CampaignCategory.LIFESTYLE,
    status: CampaignStatus.ACTIVE,
    featured: false,
    maxParticipants: 100,
    currentParticipants: 0,
    advertiserId: mockAdvertiser.id,
    advertiser: mockAdvertiser,
    participations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    canUserJoin: jest.fn(),
    toResponseObject: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: getRepositoryToken(Campaign),
          useValue: mockCampaignRepository,
        },
        {
          provide: getRepositoryToken(CampaignParticipation),
          useValue: mockParticipationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    campaignRepository = module.get<Repository<Campaign>>(getRepositoryToken(Campaign));
    participationRepository = module.get<Repository<CampaignParticipation>>(getRepositoryToken(CampaignParticipation));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign successfully', async () => {
      const createDto = {
        title: 'Test Campaign',
        description: 'Test Description',
        brandName: 'Test Brand',
        payoutUSD: 25.00,
        durationMinutes: 30,
        category: CampaignCategory.LIFESTYLE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockAdvertiser);
      mockCampaignRepository.create.mockReturnValue(mockCampaign);
      mockCampaignRepository.save.mockResolvedValue(mockCampaign);

      const result = await service.create(createDto, mockAdvertiser.id);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAdvertiser.id, isActive: true }
      });
      expect(mockCampaignRepository.create).toHaveBeenCalledWith({
        ...createDto,
        advertiserId: mockAdvertiser.id,
        advertiser: mockAdvertiser,
        startDate: undefined,
        endDate: undefined,
      });
      expect(mockCampaignRepository.save).toHaveBeenCalledWith(mockCampaign);
      expect(result).toBe(mockCampaign);
    });

    it('should throw NotFoundException if advertiser not found', async () => {
      const createDto = {
        title: 'Test Campaign',
        description: 'Test Description',
        brandName: 'Test Brand',
        payoutUSD: 25.00,
        durationMinutes: 30,
        category: CampaignCategory.LIFESTYLE,
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not advertiser', async () => {
      const createDto = {
        title: 'Test Campaign',
        description: 'Test Description',
        brandName: 'Test Brand',
        payoutUSD: 25.00,
        durationMinutes: 30,
        category: CampaignCategory.LIFESTYLE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinCampaign', () => {
    const mockParticipation = {
      id: 'participation-id',
      campaignId: mockCampaign.id,
      userId: mockUser.id,
      status: ParticipationStatus.ACTIVE,
      toResponseObject: jest.fn().mockReturnValue({}),
    };

    // Query builder returned inside the join transaction for the guarded
    // currentParticipants increment
    const mockUpdateQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    beforeEach(() => {
      mockManager.createQueryBuilder.mockReturnValue(mockUpdateQb);
      mockUpdateQb.update.mockReturnThis();
      mockUpdateQb.set.mockReturnThis();
      mockUpdateQb.where.mockReturnThis();
      mockUpdateQb.andWhere.mockReturnThis();
    });

    it('should allow user to join campaign successfully', async () => {
      (mockCampaign.canUserJoin as jest.Mock).mockReturnValue({ canJoin: true });
      mockCampaignRepository.findOne.mockResolvedValue(mockCampaign);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockManager.create.mockReturnValue(mockParticipation);
      mockManager.save.mockResolvedValue(mockParticipation);
      mockUpdateQb.execute.mockResolvedValue({ affected: 1 });

      const result = await service.joinCampaign(mockCampaign.id, mockUser.id, {});

      expect(mockCampaignRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCampaign.id },
        relations: ['participations'],
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(mockCampaign.canUserJoin).toHaveBeenCalledWith(mockUser);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledWith(mockParticipation);
      expect(mockUpdateQb.execute).toHaveBeenCalled();
      expect(result).toBe(mockParticipation);
    });

    it('should throw NotFoundException if campaign not found', async () => {
      mockCampaignRepository.findOne.mockResolvedValue(null);

      await expect(service.joinCampaign('invalid-id', mockUser.id, {}))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user cannot join', async () => {
      (mockCampaign.canUserJoin as jest.Mock).mockReturnValue({ canJoin: false, reason: 'Campaign is full' });
      mockCampaignRepository.findOne.mockResolvedValue(mockCampaign);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.joinCampaign(mockCampaign.id, mockUser.id, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the last spot is taken concurrently', async () => {
      (mockCampaign.canUserJoin as jest.Mock).mockReturnValue({ canJoin: true });
      mockCampaignRepository.findOne.mockResolvedValue(mockCampaign);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockManager.create.mockReturnValue(mockParticipation);
      mockManager.save.mockResolvedValue(mockParticipation);
      mockUpdateQb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.joinCampaign(mockCampaign.id, mockUser.id, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when the user already joined (unique violation)', async () => {
      (mockCampaign.canUserJoin as jest.Mock).mockReturnValue({ canJoin: true });
      mockCampaignRepository.findOne.mockResolvedValue(mockCampaign);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockManager.create.mockReturnValue(mockParticipation);
      mockManager.save.mockRejectedValue({ code: '23505' });

      await expect(service.joinCampaign(mockCampaign.id, mockUser.id, {}))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('getUserEarnings', () => {
    it('should return user earnings summary', async () => {
      const mockEarningsData = {
        totalEarnings: '150.00',
        pendingEarnings: '25.00',
        totalCampaigns: '10',
        completedCampaigns: '8',
        paidCampaigns: '7',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockEarningsData),
      };

      mockParticipationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUserEarnings(mockUser.id);

      expect(result).toEqual({
        totalEarnings: 150.00,
        pendingEarnings: 25.00,
        totalCampaigns: 10,
        completedCampaigns: 8,
        paidCampaigns: 7,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated campaigns', async () => {
      const filterDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt' as const,
        sortOrder: 'DESC' as const,
      };

      const mockCampaigns = [mockCampaign];
      const mockTotal = 1;

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockCampaigns, mockTotal]),
      };

      mockCampaignRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      (mockCampaign.toResponseObject as jest.Mock).mockReturnValue({ id: mockCampaign.id });

      const result = await service.findAll(filterDto);

      expect(result).toEqual({
        data: [{ id: mockCampaign.id }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });
  });
});