import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ChangePhoneRequestDto {
  @ApiProperty({
    example: '+38970123456',
    description: 'New phone number',
  })
  @IsString({ message: 'Телефонскиот број е задолжителен' })
  @Matches(/^\+\d{1,4}\d{6,15}$/, {
    message: 'Телефонскиот број мора да биде во формат +код држава (1-4 цифри) + број (6-15 цифри)',
  })
  phone: string;
}

export class ChangePhoneVerifyDto {
  @ApiProperty({
    example: '+38970123456',
    description: 'New phone number',
  })
  @IsString({ message: 'Телефонскиот број е задолжителен' })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'SMS verification code',
  })
  @IsString({ message: 'Кодот е задолжителен' })
  code: string;
}
