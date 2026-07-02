import {
  IsEmail,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class SignupDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password',
    minLength: 8
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens and apostrophes' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens and apostrophes' })
  lastName: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.MEMBER,
    description: 'User role',
    default: UserRole.MEMBER
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
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

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'User date of birth (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date in YYYY-MM-DD format' })
  dateOfBirth?: string;
}