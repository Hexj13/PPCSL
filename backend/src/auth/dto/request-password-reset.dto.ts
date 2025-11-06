import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: '+38970123456',
    description: 'Phone number in international format',
  })
  @IsString({ message: 'Телефонскиот број мора да биде стринг' })
  @Matches(/^[+]?[0-9\s()-]{8,}$/, {
    message: 'Невалиден формат на телефонски број',
  })
  phone: string;
}
