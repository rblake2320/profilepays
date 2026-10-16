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
import { Repository, DataSource, EntityManager } from 'typeorm';
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
    companyName?: string;
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
    private readonly db: DataSource
  ) {}

  async signup(signupDto: SignupDto, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    const {
      email,
      password,
      firstName,
      lastName,
      userRole,
      phoneNumber,
      dateOfBirth,
      companyName,
    } = signupDto;

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
      companyName: userRole === UserRole.ADVERTISER ? companyName?.trim() : undefined,
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
      userAgent
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
        companyName: savedUser.companyName,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<AuthResponse> {
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
    const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.userRole,
        isVerified: user.isVerified,
        companyName: user.companyName,
      },
      accessToken,
      refreshToken,
    };
  }

  private hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async refreshAccessToken(token: string, ipAddress: string, userAgent: string) {
    if (typeof token !== 'string' || !/^[a-f0-9]{80}$/.test(token))
      throw new UnauthorizedException('Invalid or expired session');
    const result = await this.db.transaction(async m => {
      const [found] = await m.query('SELECT session_id FROM refresh_tokens WHERE token=$1', [
        this.hash(token),
      ]);
      if (!found?.session_id) return null;
      const [session] = await m.query('SELECT * FROM auth_sessions WHERE id=$1 FOR UPDATE', [
        found.session_id,
      ]);
      const record = await m
        .getRepository(RefreshToken)
        .findOne({ where: { token: this.hash(token) } });
      const user = await m.getRepository(User).findOne({ where: { id: session.user_id } });
      if (session.revoked) return null;
      if (
        !record?.isValid() ||
        !user?.isActive ||
        new Date(session.expires_at) <= new Date() ||
        session.credential_hash !== this.hash(user.passwordHash)
      ) {
        await m.query('UPDATE auth_sessions SET revoked=true WHERE id=$1', [session.id]);
        return null; // Commit revocation before returning an authentication error.
      }
      record.isRevoked = true;
      record.revokedAt = new Date();
      await m.getRepository(RefreshToken).save(record);
      return this.generateTokens(user, ipAddress, userAgent, m, session.id);
    });
    if (!result) throw new UnauthorizedException('Invalid or expired session. Sign in again.');
    return result;
  }

  async logout(token: string): Promise<void> {
    if (typeof token !== 'string' || !/^[a-f0-9]{80}$/.test(token)) return;
    await this.db.transaction(async m => {
      const [r] = await m.query('SELECT session_id FROM refresh_tokens WHERE token=$1', [
        this.hash(token),
      ]);
      if (r?.session_id) {
        await m.query('SELECT id FROM auth_sessions WHERE id=$1 FOR UPDATE', [r.session_id]);
        await m.query('UPDATE auth_sessions SET revoked=true WHERE id=$1', [r.session_id]);
        await m.query(
          'UPDATE refresh_tokens SET is_revoked=true,revoked_at=now() WHERE session_id=$1',
          [r.session_id]
        );
      }
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.db.transaction(async m => {
      await m.query('UPDATE auth_sessions SET revoked=true WHERE user_id=$1', [userId]);
      await m.query('UPDATE refresh_tokens SET is_revoked=true,revoked_at=now() WHERE user_id=$1', [
        userId,
      ]);
    });
  }

  private async generateTokens(
    user: User,
    ipAddress: string,
    userAgent: string,
    manager?: EntityManager,
    sessionId?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!manager)
      return this.db.transaction(m => this.generateTokens(user, ipAddress, userAgent, m));
    const id = sessionId || crypto.randomUUID();
    if (!sessionId)
      await manager.query(
        "INSERT INTO auth_sessions(id,user_id,credential_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
        [id, user.id, this.hash(user.passwordHash)]
      );
    const [session] = await manager.query('SELECT expires_at FROM auth_sessions WHERE id=$1', [id]);
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, userRole: user.userRole, sid: id },
      { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await manager
      .getRepository(RefreshToken)
      .save(
        manager
          .getRepository(RefreshToken)
          .create({
            token: this.hash(refreshToken),
            sessionId: id,
            userId: user.id,
            expiresAt: new Date(session.expires_at),
            userAgent: userAgent.slice(0, 500),
            ipAddress,
          })
      );
    return { accessToken, refreshToken };
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
      .where("expires_at < now() - interval '8 days'")
      .execute();

    this.logger.log(`Cleaned up ${deletedCount.affected} expired/revoked refresh tokens`);
  }
}
