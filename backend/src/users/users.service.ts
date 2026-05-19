import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  paypalEmail?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async getWalletBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.findById(userId);
    return { balance: Number(user.walletBalance) };
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'userType', 'firstName', 'lastName', 'isActive', 'createdAt'],
    });
  }

  async suspendUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.isActive = true;
    return this.userRepository.save(user);
  }
}
