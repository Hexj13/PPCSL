import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifySmsDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit verification code',
  })
  @IsString({ message: 'Кодот мора да биде стринг' })
  @Length(6, 6, { message: 'Кодот мора да содржи точно 6 цифри' })
  @Matches(/^\d{6}$/, { message: 'Кодот мора да содржи само цифри' })
  code: string;

  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number',
  })
  @IsString({ message: 'Телефонскиот број мора да биде стринг' })
  phone: string;
}
