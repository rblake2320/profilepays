import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userRole: UserRole;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(
    signupDto: SignupDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const { email, password, firstName, lastName, userRole, phoneNumber, dateOfBirth } = signupDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours

    // Create user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      userRole: userRole || UserRole.MEMBER,
      phoneNumber: phoneNumber?.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      emailVerificationToken,
      emailVerificationExpires,
      isVerified: false,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(`New user registered: ${savedUser.email}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      savedUser,
      ipAddress,
      userAgent,
    );

    // TODO: Send verification email
    this.logger.log(`Email verification token generated for user: ${savedUser.email}`);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        userRole: savedUser.userRole,
        isVerified: savedUser.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User logged in: ${user.email}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      ipAddress,
      userAgent,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.userRole,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(
    refreshTokenString: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshTokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
      relations: ['user'],
    });

    if (!refreshTokenRecord || !refreshTokenRecord.isValid()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old refresh token
    refreshTokenRecord.isRevoked = true;
    refreshTokenRecord.revokedAt = new Date();
    await this.refreshTokenRepository.save(refreshTokenRecord);

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      refreshTokenRecord.user,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Tokens refreshed for user: ${refreshTokenRecord.user.email}`);

    return { accessToken, refreshToken };
  }

  async logout(refreshTokenString: string): Promise<void> {
    const refreshTokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
    });

    if (refreshTokenRecord && !refreshTokenRecord.isRevoked) {
      refreshTokenRecord.isRevoked = true;
      refreshTokenRecord.revokedAt = new Date();
      await this.refreshTokenRepository.save(refreshTokenRecord);

      this.logger.log(`User logged out, refresh token revoked`);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    this.logger.log(`All sessions revoked for user: ${userId}`);
  }

  private async generateTokens(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userRole: user.userRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    // Generate refresh token
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    // Save refresh token to database
    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenString,
      userId: user.id,
      expiresAt: refreshTokenExpiry,
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user || !user.emailVerificationExpires) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await this.userRepository.save(user);

    this.logger.log(`Email verified for user: ${user.email}`);
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;

    await this.userRepository.save(user);

    // TODO: Send verification email
    this.logger.log(`Email verification resent for user: ${user.email}`);
  }

  // Clean up expired refresh tokens (should be called periodically)
  async cleanupExpiredTokens(): Promise<void> {
    const deletedCount = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now OR is_revoked = true', { now: new Date() })
      .execute();

    this.logger.log(`Cleaned up ${deletedCount.affected} expired/revoked refresh tokens`);
  }
}