import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignParticipation } from './entities/campaign-participation.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignParticipation]),
    UsersModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
