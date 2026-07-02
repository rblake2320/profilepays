import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsUrl,
  IsArray,
  IsObject,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsHexColor,
  ArrayMaxSize,
  IsISO8601,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CampaignCategory, SocialNetwork } from '../entities/campaign.entity';

class CampaignRequirementsDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  minFollowers?: number;

  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(100)
  minAge?: number;

  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(100)
  maxAge?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  targetCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  targetGenders?: string[];

  @IsOptional()
  @IsBoolean()
  verificationRequired?: boolean;
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  description: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  brandName: string;

  @IsOptional()
  @IsUrl()
  brandLogo?: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string = '#000000';

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(10000)
  payoutUSD: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(10080) // Max 1 week in minutes
  durationMinutes: number;

  @IsEnum(CampaignCategory)
  category: CampaignCategory;

  @IsOptional()
  @IsEnum(SocialNetwork)
  network?: SocialNetwork;

  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100000)
  maxParticipants?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignRequirementsDto)
  requirements?: CampaignRequirementsDto;

  @IsOptional()
  @IsUrl()
  campaignUrl?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Max(1000000)
  totalBudget?: number;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean = false;
}