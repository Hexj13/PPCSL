import { IsString, Length, Matches } from 'class-validator';

export class VerifySmsDto {
  @IsString({ message: 'Кодот мора да биде стринг' })
  @Length(6, 6, { message: 'Кодот мора да содржи точно 6 цифри' })
  @Matches(/^\d{6}$/, { message: 'Кодот мора да содржи само цифри' })
  code: string;

  @IsString({ message: 'Телефонскиот број мора да биде стринг' })
  phone: string;
}
