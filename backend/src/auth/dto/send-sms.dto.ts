import { IsString, Matches } from 'class-validator';

export class SendSmsDto {
  @IsString({ message: 'Телефонскиот број мора да биде стринг' })
  @Matches(/^[+]?[0-9\s()-]{8,}$/, {
    message: 'Невалиден формат на телефонски број',
  })
  phone: string;
}
