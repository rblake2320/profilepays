import {
  ValidateIf,
  IsEmail,
  IsString,
  IsEnum,
  IsIn,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';
import { Transform } from 'class-transformer';
import { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_PATTERN, PASSWORD_HELP, NAME_PATTERN, NAME_HELP, trimText } from '../signup-policy';

export class SignupDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @Transform(({ value }) => trimText(value))
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password',
    minLength: 8
  })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: 'Password must be at least 8 characters long' })
  @MaxLength(PASSWORD_MAX, { message: 'Password must not exceed 128 characters' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_HELP })
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Matches(NAME_PATTERN, { message: `First name: ${NAME_HELP}` })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Matches(NAME_PATTERN, { message: `Last name: ${NAME_HELP}` })
  lastName: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.MEMBER,
    description: 'User role',
    default: UserRole.MEMBER
  })
  @IsOptional()
  @IsIn([UserRole.MEMBER, UserRole.ADVERTISER], { message: 'Invalid signup role' })
  userRole?: UserRole = UserRole.MEMBER;

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

  @ApiPropertyOptional({ description: 'Required for advertisers', maxLength: 200 })
  @Transform(({ value }) => trimText(value))
  @ValidateIf(o => o.userRole === UserRole.ADVERTISER || o.companyName !== undefined)
  @IsString({ message: 'Company name is required for advertisers' })
  @MinLength(1, { message: 'Company name is required for advertisers' })
  @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
  companyName?: string;

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'User date of birth (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date in YYYY-MM-DD format' })
  dateOfBirth?: string;
}
