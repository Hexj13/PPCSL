import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { IsPassword } from '../../../common/decorators/is-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentPass123!',
    description: 'Current password',
  })
  @IsNotEmpty({ message: 'errors.currentPasswordRequired' })
  @IsString({ message: 'validation.string' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password',
  })
  @IsNotEmpty({ message: 'errors.newPasswordRequired' })
  @IsString({ message: 'validation.string' })
  @MinLength(8, { message: 'validation.passwordMinLength' })
  @MaxLength(100, { message: 'validation.passwordMaxLength' })
  @IsPassword()
  newPassword: string;
}
