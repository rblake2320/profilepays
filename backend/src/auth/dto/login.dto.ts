import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { trimText } from '../signup-policy';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address'
  })
  @Transform(({ value }) => trimText(value))
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
