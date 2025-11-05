import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Токенот е задолжителен' })
  @IsString({ message: 'Токенот мора да биде стринг' })
  token: string;
}

