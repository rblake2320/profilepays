import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CampaignCategory, SocialNetwork, CampaignStatus } from '../entities/campaign.entity';

export class CampaignFilterDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  search?: string;

  @IsOptional()
  @IsEnum(CampaignCategory)
  category?: CampaignCategory;

  @IsOptional()
  @IsEnum(SocialNetwork)
  network?: SocialNetwork;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  minPayout?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  maxPayout?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  minDuration?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  maxDuration?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  hasSpots?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  })
  tags?: string[];

  // Pagination
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  // Sorting
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'payoutUSD' | 'durationMinutes' | 'title' | 'endDate' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}