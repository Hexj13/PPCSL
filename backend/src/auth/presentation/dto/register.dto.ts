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

import { IsName } from '../../../common/decorators/is-name.decorator';
import { IsPassword } from '../../../common/decorators/is-password.decorator';
import { IsPhone } from '../../../common/decorators/is-phone.decorator';
import { UserType, UserType as UserTypeEnum } from '../../../common/types';

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address (optional)',
  })
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'validation.emailInvalid' })
  email?: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, must contain uppercase and lowercase)',
  })
  @IsString()
  @MinLength(8, { message: 'validation.passwordMinLength' })
  @MaxLength(100, { message: 'validation.passwordMaxLength' })
  @IsPassword()
  password: string;

  @ApiProperty({
    example: 'Individual',
    enum: ['Individual', 'Business'],
    description: 'User type',
  })
  @IsEnum(UserType, { message: 'validation.userTypeEnum' })
  @NotEquals(UserTypeEnum.Admin, { message: 'validation.cannotRegisterAsAdmin' })
  type: UserType;

  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number (required for all user types)',
  })
  @IsNotEmpty({ message: 'validation.phoneRequiredField' })
  @IsString({ message: 'validation.phoneRequiredField' })
  @IsPhone()
  phone: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'First name',
  })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString()
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
    description: 'Company name (required for Business type)',
  })
  @ValidateIf((o) => o.type === UserTypeEnum.Business)
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'validation.companyNameMinLength' })
  @MaxLength(100, { message: 'validation.companyNameMaxLength' })
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
  @IsNotEmpty({ message: 'validation.termsMustBeAccepted' })
  @IsBoolean({ message: 'validation.termsAcceptedBoolean' })
  termsAccepted: boolean;
}
