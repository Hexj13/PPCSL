import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { IsName } from '../../../common/decorators/is-name.decorator';
import { IsPhone } from '../../../common/decorators/is-phone.decorator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'validation.emailInvalid' })
  email?: string;
  @ApiPropertyOptional({
    example: 'John',
    description: 'First name',
  })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString({ message: 'validation.string' })
  @MinLength(2, { message: 'validation.firstNameMinLength' })
  @MaxLength(50, { message: 'validation.firstNameMaxLength' })
  @IsName()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name',
  })
  @IsOptional()
  @ValidateIf((o) => o.lastName != null && o.lastName !== '')
  @IsString()
  @MinLength(2, { message: 'validation.lastNameMinLength' })
  @MaxLength(50, { message: 'validation.lastNameMaxLength' })
  @IsName()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'My Company Ltd',
    description: 'Company name (for Business type)',
  })
  @IsOptional()
  @ValidateIf((o) => o.companyName != null && o.companyName !== '')
  @IsString()
  @MinLength(2, { message: 'validation.companyNameMinLength' })
  @MaxLength(100, { message: 'validation.companyNameMaxLength' })
  companyName?: string;

  @ApiPropertyOptional({
    example: 'https://example.com',
    description: 'Company website URL (for Business type)',
  })
  @IsOptional()
  @ValidateIf((o) => o.companyWebsiteUrl != null && o.companyWebsiteUrl !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'validation.companyWebsiteUrl' },
  )
  @MaxLength(500)
  companyWebsiteUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable listing refresh reminder emails',
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationListingRefreshReminders?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable weekly views digest emails',
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationWeeklyViewsDigest?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable account security alert emails',
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationSecurityAlerts?: boolean;

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

  @ApiPropertyOptional({
    example: '+49891234567',
    description: 'Optional additional business contact phone (E.164-style; not verified by SMS)',
  })
  @IsOptional()
  @ValidateIf((o) => o.additionalPhone != null && o.additionalPhone !== '')
  @IsPhone()
  additionalPhone?: string;

  @ApiPropertyOptional({
    example: '+37360123456',
    description:
      'Primary account phone (only when the account has no phone yet; use the change-phone flow otherwise)',
  })
  @IsOptional()
  @ValidateIf((o) => o.phone != null && o.phone !== '')
  @IsPhone()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Business',
    description: 'Account type (only while primary phone is not verified)',
    enum: ['Individual', 'Business'],
  })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiPropertyOptional({
    example: 'ro',
    description: 'Preferred UI locale (ro or ru)',
    enum: ['ro', 'ru'],
  })
  @IsOptional()
  @IsIn(['ro', 'ru'], { message: 'errors.invalidPreferredLocale' })
  preferredLocale?: 'ro' | 'ru';
}
