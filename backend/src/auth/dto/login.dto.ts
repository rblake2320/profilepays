import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password'
  })
  @IsString()
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}