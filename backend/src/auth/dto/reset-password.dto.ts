import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '+38970123456',
    description: 'Phone number in international format',
  })
  @IsString({ message: 'Телефонскиот број мора да биде стринг' })
  @Matches(/^[+]?[0-9\s()-]{8,}$/, {
    message: 'Невалиден формат на телефонски број',
  })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit verification code',
  })
  @IsString({ message: 'Кодот мора да биде стринг' })
  @Matches(/^\d{6}$/, {
    message: 'Кодот мора да содржи точно 6 цифри',
  })
  code: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password',
  })
  @IsString({ message: 'Лозинката мора да биде стринг' })
  @MinLength(8, { message: 'Лозинката мора да биде најмалку 8 карактери' })
  newPassword: string;
}
