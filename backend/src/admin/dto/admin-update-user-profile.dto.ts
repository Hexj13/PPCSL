import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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
  @IsEmail({}, { message: 'Невалидна email адреса' })
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @ValidateIf((o) => o.firstName != null && o.firstName !== '')
  @IsString({ message: 'Името мора да биде стринг' })
  @MinLength(2, { message: 'Името мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Името не може да биде подолго од 50 карактери' })
  @IsName()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @ValidateIf((o) => o.lastName != null && o.lastName !== '')
  @IsString()
  @MinLength(2, { message: 'Презимето мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Презимето не може да биде подолго од 50 карактери' })
  @IsName()
  lastName?: string;

  @ApiPropertyOptional({ example: 'My Company Ltd' })
  @IsOptional()
  @ValidateIf((o) => o.companyName != null && o.companyName !== '')
  @IsString()
  @MinLength(2, { message: 'Името на компанијата мора да содржи минимум 2 карактери' })
  @MaxLength(100, { message: 'Името на компанијата не може да биде подолго од 100 карактери' })
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @ValidateIf((o) => o.companyWebsiteUrl != null && o.companyWebsiteUrl !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL мора да започнува со http или https и да биде валидна адреса' },
  )
  @MaxLength(500)
  companyWebsiteUrl?: string;

  @ApiPropertyOptional({ example: '+49891234567' })
  @IsOptional()
  @ValidateIf((o) => o.additionalPhone != null && o.additionalPhone !== '')
  @IsPhone()
  additionalPhone?: string;
}
