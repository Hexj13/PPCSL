import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number in international format',
  })
  @IsNotEmpty({ message: 'errors.phoneRequired' })
  @IsString({ message: 'validation.string' })
  @Matches(/^[+]?[0-9\s()-]{8,}$/, {
    message: 'validation.phone',
  })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit verification code',
  })
  @IsNotEmpty({ message: 'errors.codeRequired' })
  @IsString({ message: 'validation.string' })
  @Matches(/^\d{6}$/, {
    message: 'validation.codeLength',
  })
  code: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password',
  })
  @IsNotEmpty({ message: 'errors.newPasswordRequired' })
  @IsString({ message: 'validation.string' })
  @MinLength(8, { message: 'validation.passwordMinLength' })
  newPassword: string;
}
