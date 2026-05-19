import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserType } from '../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    const { email, password, userType, firstName, lastName, companyName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      userType,
      firstName,
      lastName,
      companyName,
    });

    const savedUser = await this.userRepository.save(user);
    return this.generateTokens(savedUser);
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is suspended');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private generateTokens(user: User): AuthTokens {
    const payload = { sub: user.id, email: user.email, userType: user.userType };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRATION || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      });

      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { sub: user.id, email: user.email, userType: user.userType };
      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: process.env.JWT_EXPIRATION || '7d',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
