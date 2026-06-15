import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TelegramSignInDto {
  @ApiProperty({ description: 'OIDC id_token from Telegram Login' })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'Server-issued nonce used in the Telegram Login request' })
  @IsNotEmpty()
  @IsString()
  nonce: string;

  @ApiPropertyOptional({ enum: ['Individual', 'Business'] })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
