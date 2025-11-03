import { IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Email или телефон е задолжителен' })
  login: string;

  @IsString()
  password: string;
}
