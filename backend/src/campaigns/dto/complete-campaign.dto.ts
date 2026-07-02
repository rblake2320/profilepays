import {
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CompletionProofDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsUrl()
  socialPostUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CompleteCampaignDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CompletionProofDto)
  proof?: CompletionProofDto;

  @IsOptional()
  @IsString()
  notes?: string;
}