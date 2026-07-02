import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens and apostrophes' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens and apostrophes' })
  lastName?: string;

  @ApiPropertyOptional({
    example: '+1-555-0123',
    description: 'User phone number',
    maxLength: 20
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  @Matches(/^[\+]?[\d\s\-\(\)]+$/, { message: 'Please provide a valid phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'User date of birth (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date in YYYY-MM-DD format' })
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Profile image URL must not exceed 500 characters' })
  profileImage?: string;
}