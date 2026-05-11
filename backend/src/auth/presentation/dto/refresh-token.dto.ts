import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token for obtaining new access token (optional when sent as httpOnly cookie)',
    example: 'abc123...',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refresh_token?: string;
}
