import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsDateString, IsArray } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  interests?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  demographics?: {
    gender?: string;
    location?: string;
    ageRange?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  paypalEmail?: string;
}
