import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, [] as const)
) {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}