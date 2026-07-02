import {
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class JoinCampaignMetadataDto {
  @IsOptional()
  @IsString()
  userMessage?: string;

  @IsOptional()
  @IsString()
  referralSource?: string;

  @IsOptional()
  @IsObject()
  socialProfiles?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    snapchat?: string;
    pinterest?: string;
    twitch?: string;
    discord?: string;
  };
}

export class JoinCampaignDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => JoinCampaignMetadataDto)
  metadata?: JoinCampaignMetadataDto;
}