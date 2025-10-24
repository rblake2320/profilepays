import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsObject,
  Min,
  IsUrl,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Brand Campaign' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Promote our new summer collection' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  sponsoredImageUrl: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  @IsOptional()
  @IsUrl()
  targetLink?: string;

  @ApiProperty({
    example: {
      ageRange: ['18-24', '25-34'],
      gender: ['male', 'female'],
      interests: ['fashion', 'sports'],
      locations: ['US', 'UK'],
      minFollowers: 1000,
    },
  })
  @IsObject()
  targetAudience: {
    ageRange?: string[];
    gender?: string[];
    interests?: string[];
    locations?: string[];
    minFollowers?: number;
  };

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  budget: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  payoutPerUser: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiProperty({ example: '2025-11-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-11-30T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 24, required: false })
  @IsOptional()
  @IsNumber()
  minimumDurationHours?: number;
}
