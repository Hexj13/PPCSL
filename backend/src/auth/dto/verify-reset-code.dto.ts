import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyResetCodeDto {
  @ApiProperty({
    example: '+37370123456',
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
}
