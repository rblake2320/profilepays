import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: User; token: string }> {
    const { email, username, password, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      ...userData,
    });

    await this.userRepository.save(user);

    // Generate token
    const token = this.generateToken(user);

    // Remove sensitive data
    delete user.passwordHash;

    return { user, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate token
    const token = this.generateToken(user);

    // Remove sensitive data
    delete user.passwordHash;

    return { user, token };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    delete user.passwordHash;
    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      userType: user.userType,
    };

    return this.jwtService.sign(payload);
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
