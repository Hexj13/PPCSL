import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TelegramSignInDto {
  @ApiProperty({ description: 'Telegram user id from the Login Widget' })
  @IsNotEmpty()
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: 'Telegram first name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Telegram last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'Telegram username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Telegram profile photo URL' })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiProperty({ description: 'Login Widget auth_date (unix seconds)' })
  @IsNotEmpty()
  @IsInt()
  auth_date: number;

  @ApiProperty({ description: 'Login Widget HMAC-SHA256 hash' })
  @IsNotEmpty()
  @IsString()
  hash: string;

  @ApiPropertyOptional({ enum: ['Individual', 'Business'] })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
