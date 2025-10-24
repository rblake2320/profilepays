import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SubscriptionTier } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['participations', 'campaigns'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    delete user.passwordHash;
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    delete user.passwordHash;
    return user;
  }

  async updateSubscriptionTier(
    id: string,
    tier: SubscriptionTier,
  ): Promise<User> {
    const user = await this.findOne(id);
    user.subscriptionTier = tier;
    await this.userRepository.save(user);

    delete user.passwordHash;
    return user;
  }

  async addEarnings(id: string, amount: number): Promise<User> {
    const user = await this.findOne(id);
    user.totalEarnings = Number(user.totalEarnings) + amount;
    user.availableBalance = Number(user.availableBalance) + amount;
    await this.userRepository.save(user);

    return user;
  }

  async deductBalance(id: string, amount: number): Promise<User> {
    const user = await this.findOne(id);

    if (Number(user.availableBalance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    user.availableBalance = Number(user.availableBalance) - amount;
    await this.userRepository.save(user);

    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isActive = false;
    await this.userRepository.save(user);
  }
}
