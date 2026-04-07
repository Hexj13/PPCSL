import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { IsName } from '../../common/decorators/is-name.decorator';
import { IsPhone } from '../../common/decorators/is-phone.decorator';

export class AdminUpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'validation.emailInvalid' })
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString({ message: 'validation.string' })
  @MinLength(2, { message: 'validation.firstNameMinLength' })
  @MaxLength(50, { message: 'validation.firstNameMaxLength' })
  @IsName()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @ValidateIf((o) => o.lastName != null && o.lastName !== '')
  @IsString()
  @MinLength(2, { message: 'validation.lastNameMinLength' })
  @MaxLength(50, { message: 'validation.lastNameMaxLength' })
  @IsName()
  lastName?: string;

  @ApiPropertyOptional({ example: 'My Company Ltd' })
  @IsOptional()
  @ValidateIf((o) => o.companyName != null && o.companyName !== '')
  @IsString()
  @MinLength(2, { message: 'validation.companyNameMinLength' })
  @MaxLength(100, { message: 'validation.companyNameMaxLength' })
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @ValidateIf((o) => o.companyWebsiteUrl != null && o.companyWebsiteUrl !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'validation.companyWebsiteUrl' },
  )
  @MaxLength(500)
  companyWebsiteUrl?: string;

  @ApiPropertyOptional({ example: '+49891234567' })
  @IsOptional()
  @ValidateIf((o) => o.additionalPhone != null && o.additionalPhone !== '')
  @IsPhone()
  additionalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}
