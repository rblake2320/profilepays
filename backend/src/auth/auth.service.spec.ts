import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  // Real JwtService: guards against regressions where the payload passed to
  // sign() conflicts with signOptions (jsonwebtoken throws if payload.exp is
  // set alongside expiresIn — this took every login down once already).
  const realJwtService = new JwtService({ secret: 'test-secret' });

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const signupDto = {
    email: 'New.User@Example.com',
    password: 'S3cure!pass',
    firstName: 'New',
    lastName: 'User',
  };

  const buildUser = async (): Promise<User> =>
    ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'new.user@example.com',
      passwordHash: await bcrypt.hash('S3cure!pass', 4),
      firstName: 'New',
      lastName: 'User',
      userRole: UserRole.MEMBER,
      isVerified: false,
      isActive: true,
    }) as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: realJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-secret');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('registers a new user and returns working tokens', async () => {
      const savedUser = await buildUser();
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => data);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockRefreshTokenRepository.create.mockImplementation((data) => data);
      mockRefreshTokenRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.signup(signupDto, '127.0.0.1', 'jest');

      // Email must be normalized to lowercase before both lookup and save
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new.user@example.com' },
      });
      expect(result.user.email).toBe('new.user@example.com');

      // The access token must decode with the expected claims and an expiry
      // set by the library (regression: payload.exp + expiresIn threw)
      const decoded = realJwtService.verify(result.accessToken, { secret: 'test-secret' });
      expect(decoded.sub).toBe(savedUser.id);
      expect(decoded.exp - decoded.iat).toBe(15 * 60);

      expect(result.refreshToken).toMatch(/^[0-9a-f]{80}$/);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('rejects duplicate emails with 409', async () => {
      mockUserRepository.findOne.mockResolvedValue(await buildUser());

      await expect(service.signup(signupDto, '127.0.0.1', 'jest')).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('hashes the password — never stores it in clear', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => data);
      mockUserRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'generated-id' }),
      );
      mockRefreshTokenRepository.create.mockImplementation((data) => data);
      mockRefreshTokenRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.signup(signupDto, '127.0.0.1', 'jest');

      const created = mockUserRepository.create.mock.calls[0][0];
      expect(created.passwordHash).toBeDefined();
      expect(created.passwordHash).not.toBe(signupDto.password);
      expect(await bcrypt.compare(signupDto.password, created.passwordHash)).toBe(true);
    });
  });

  describe('login', () => {
    it('authenticates a valid user and issues tokens', async () => {
      const user = await buildUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockImplementation((data) => data);
      mockRefreshTokenRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.login(
        { email: user.email, password: 'S3cure!pass' },
        '127.0.0.1',
        'jest',
      );

      expect(result.user.id).toBe(user.id);
      expect(realJwtService.verify(result.accessToken, { secret: 'test-secret' }).email).toBe(
        user.email,
      );
    });

    it('rejects a wrong password with 401 and does not leak which field failed', async () => {
      mockUserRepository.findOne.mockResolvedValue(await buildUser());

      await expect(
        service.login({ email: 'new.user@example.com', password: 'wrong' }, '127.0.0.1', 'jest'),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('rejects an unknown email with the same 401 message', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'whatever' }, '127.0.0.1', 'jest'),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('rejects a deactivated account', async () => {
      const user = await buildUser();
      user.isActive = false;
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'S3cure!pass' }, '127.0.0.1', 'jest'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshAccessToken', () => {
    it('rotates the refresh token: old one is revoked, new one is issued', async () => {
      const user = await buildUser();
      const record = {
        token: 'old-token',
        user,
        isRevoked: false,
        revokedAt: null as Date | null,
        isValid: () => true,
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(record);
      mockRefreshTokenRepository.save.mockImplementation((data) => Promise.resolve(data));
      mockRefreshTokenRepository.create.mockImplementation((data) => data);

      const result = await service.refreshAccessToken('old-token', '127.0.0.1', 'jest');

      expect(record.isRevoked).toBe(true);
      expect(result.refreshToken).not.toBe('old-token');
      expect(realJwtService.verify(result.accessToken, { secret: 'test-secret' }).sub).toBe(
        user.id,
      );
    });

    it('rejects an expired or revoked refresh token with 401', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        isValid: () => false,
      });

      await expect(
        service.refreshAccessToken('stale-token', '127.0.0.1', 'jest'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown refresh token with 401', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('missing-token', '127.0.0.1', 'jest'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
