import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { CreateCampaignDto, UpdateCampaignDto } from './campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>
  ) {}

  async create(advertiserId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepository.create({
      ...createCampaignDto,
      advertiserId,
    });

    return this.campaignsRepository.save(campaign);
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignsRepository.find({
      relations: ['advertiser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAdvertiser(advertiserId: string): Promise<Campaign[]> {
    return this.campaignsRepository.find({
      where: { advertiserId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id },
      relations: ['advertiser'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(
    id: string,
    userId: string,
    updateCampaignDto: UpdateCampaignDto
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

    // Ensure user owns the campaign
    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You do not have permission to update this campaign');
    }

    Object.assign(campaign, updateCampaignDto);

    return this.campaignsRepository.save(campaign);
  }

  async remove(id: string, userId: string): Promise<void> {
    const campaign = await this.findOne(id);

    // Ensure user owns the campaign
    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this campaign');
    }

    await this.campaignsRepository.remove(campaign);
  }

  async incrementImpression(id: string): Promise<void> {
    await this.campaignsRepository.increment({ id }, 'impressions', 1);
  }

  async incrementClick(id: string): Promise<void> {
    await this.campaignsRepository.increment({ id }, 'clicks', 1);
  }
}
