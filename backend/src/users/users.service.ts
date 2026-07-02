import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { firstName, lastName, phoneNumber, dateOfBirth, profileImage } = updateProfileDto;

    // Update fields if provided
    if (firstName !== undefined) {
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      user.lastName = lastName.trim();
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber?.trim() || null;
    }

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage?.trim() || null;
    }

    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`Profile updated for user: ${updatedUser.email}`);

    return updatedUser;
  }

  async deactivateUser(userId: string): Promise<void> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    this.logger.log(`User deactivated: ${user.email}`);
  }

  async findUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const query = this.userRepository.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (search) {
      query.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      totalPages,
    };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    memberUsers: number;
    advertiserUsers: number;
    adminUsers: number;
  }> {
    const [
      totalUsers,
      verifiedUsers,
      memberUsers,
      advertiserUsers,
      adminUsers,
    ] = await Promise.all([
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isActive: true, isVerified: true } }),
      this.userRepository.count({ where: { isActive: true, userRole: UserRole.MEMBER } }),
      this.userRepository.count({ where: { isActive: true, userRole: UserRole.ADVERTISER } }),
      this.userRepository.count({ where: { isActive: true, userRole: UserRole.ADMIN } }),
    ]);

    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      memberUsers,
      advertiserUsers,
      adminUsers,
    };
  }
}