import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The opaque 80-character hexadecimal token returned at login'
  })
  @IsString()
  @Matches(/^[a-f0-9]{80}$/, { message: 'Please provide a valid refresh token' })
  refreshToken: string;
}
