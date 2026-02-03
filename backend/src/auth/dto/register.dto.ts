import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  NotEquals,
  ValidateIf,
} from 'class-validator';

import { IsName } from '../../common/decorators/is-name.decorator';
import { IsPassword } from '../../common/decorators/is-password.decorator';
import { IsPhone } from '../../common/decorators/is-phone.decorator';
import { UserType, UserType as UserTypeEnum } from '../../common/types';

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address (optional)',
  })
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'Невалидна email адреса' })
  email?: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, must contain uppercase and lowercase)',
  })
  @IsString()
  @MinLength(8, { message: 'Лозинката мора да содржи минимум 8 карактери' })
  @MaxLength(100, { message: 'Лозинката не може да биде подолга од 100 карактери' })
  @IsPassword()
  password: string;

  @ApiProperty({
    example: 'Individual',
    enum: ['Individual', 'Business'],
    description: 'User type',
  })
  @IsEnum(UserType, { message: 'Типот на корисникот мора да биде Individual или Business' })
  @NotEquals(UserTypeEnum.Admin, { message: 'Не можете да се регистрирате како администратор' })
  type: UserType;

  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number (required for all user types)',
  })
  @IsNotEmpty({ message: 'Телефонот е задолжителен' })
  @IsString({ message: 'Телефонот е задолжителен' })
  @IsPhone()
  phone: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'First name',
  })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString()
  @MinLength(2, { message: 'Името мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Името не може да биде подолго од 50 карактери' })
  @IsName()
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
  @IsName()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'My Company Ltd',
    description: 'Company name (required for Business type)',
  })
  @ValidateIf((o) => o.type === UserTypeEnum.Business)
  @IsOptional()
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

  @ApiProperty({
    example: true,
    description: 'Accept terms and conditions',
  })
  @IsNotEmpty({ message: 'Мора да ги прифатите условите за користење' })
  @IsBoolean({ message: 'termsAccepted мора да биде булова вредност' })
  termsAccepted: boolean;
}
