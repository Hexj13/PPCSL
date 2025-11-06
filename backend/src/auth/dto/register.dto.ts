import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotEquals,
  ValidateIf,
} from 'class-validator';

import { UserType, UserType as UserTypeEnum } from '../../common/types';

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address (required for Business type)',
  })
  @ValidateIf((o) => o.type === UserTypeEnum.Business)
  @IsNotEmpty({ message: 'Email е задолжителен за правно лице' })
  @ValidateIf(
    (o) => o.type === UserTypeEnum.Business || (o.type === UserTypeEnum.Individual && o.email),
  )
  @IsEmail({}, { message: 'Невалидна email адреса' })
  email?: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, must contain uppercase, lowercase, and special character)',
  })
  @IsString()
  @MinLength(8, { message: 'Лозинката мора да содржи минимум 8 карактери' })
  @MaxLength(100, { message: 'Лозинката не може да биде подолга од 100 карактери' })
  @Matches(/[A-Z]/, { message: 'Лозинката мора да содржи барем една голема буква' })
  @Matches(/[a-z]/, { message: 'Лозинката мора да содржи барем една мала буква' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Лозинката мора да содржи барем еден специјален карактер',
  })
  password: string;

  @ApiProperty({
    example: 'Individual',
    enum: ['Individual', 'Business'],
    description: 'User type',
  })
  @IsEnum(UserType, { message: 'Типот на корисникот мора да биде Individual или Business' })
  @NotEquals(UserTypeEnum.Admin, { message: 'Не можете да се регистрирате како администратор' })
  type: UserType;

  @ApiPropertyOptional({
    example: '+38970123456',
    description: 'Phone number (required for Individual type)',
  })
  @ValidateIf((o) => o.type === UserTypeEnum.Individual)
  @IsString({ message: 'Телефонот е задолжителен' })
  @Matches(/^\+\d{1,4}\d{6,15}$/, {
    message: 'Телефонот мора да биде во формат +код држава (1-4 цифри) + број (6-15 цифри)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'First name (required for Individual type)',
  })
  @ValidateIf((o) => o.type === UserTypeEnum.Individual)
  @IsString({ message: 'Името е задолжително' })
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
