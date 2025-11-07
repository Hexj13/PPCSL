import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'Невалидна email адреса' })
  email?: string;
  @ApiPropertyOptional({
    example: 'John',
    description: 'First name',
  })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString({ message: 'Името мора да биде стринг' })
  @MinLength(2, { message: 'Името мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Името не може да биде подолго од 50 карактери' })
  @Matches(/^[a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s\-]+$/, {
    message: 'Името може да содржи само букви, пробели, тире и дефис',
  })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name',
  })
  @IsOptional()
  @ValidateIf((o) => o.lastName != null && o.lastName !== '')
  @IsString()
  @MinLength(2, { message: 'Презимето мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Презимето не може да биде подолго од 50 карактери' })
  @Matches(/^[a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s\-]+$/, {
    message: 'Презимето може да содржи само букви, пробели, тире и дефис',
  })
  lastName?: string;

  @ApiPropertyOptional({
    example: 'My Company Ltd',
    description: 'Company name (for Business type)',
  })
  @IsOptional()
  @ValidateIf((o) => o.companyName != null && o.companyName !== '')
  @IsString()
  @MinLength(2, { message: 'Името на компанијата мора да содржи минимум 2 карактери' })
  @MaxLength(100, { message: 'Името на компанијата не може да биде подолго од 100 карактери' })
  companyName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable Viber contact',
  })
  @IsOptional()
  @IsBoolean()
  viber?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable WhatsApp contact',
  })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable Telegram contact',
  })
  @IsOptional()
  @IsBoolean()
  telegram?: boolean;
}
