import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from '../database/entities/campaign.entity';
import { Participation } from '../database/entities/participation.entity';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Participation, User])],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
