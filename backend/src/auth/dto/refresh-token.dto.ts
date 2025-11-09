import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token for obtaining new access token',
    example: 'abc123...',
  })
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}
