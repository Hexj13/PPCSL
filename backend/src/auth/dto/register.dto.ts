import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
  ValidateIf,
  NotEquals,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { UserType } from '../../users/entities/user.entity';

export class RegisterDto {
  @ValidateIf((o) => o.type === UserType.Business)
  @IsNotEmpty({ message: 'Email е задолжителен за правно лице' })
  @ValidateIf((o) => o.type === UserType.Business || (o.type === UserType.Individual && o.email))
  @IsEmail({}, { message: 'Невалидна email адреса' })
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Лозинката мора да содржи минимум 8 карактери' })
  @MaxLength(100, { message: 'Лозинката не може да биде подолга од 100 карактери' })
  @Matches(/[A-Z]/, { message: 'Лозинката мора да содржи барем една голема буква' })
  @Matches(/[a-z]/, { message: 'Лозинката мора да содржи барем една мала буква' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Лозинката мора да содржи барем еден специјален карактер',
  })
  password: string;

  @IsEnum(UserType, { message: 'Типот на корисникот мора да биде Individual или Business' })
  @NotEquals(UserType.Admin, { message: 'Не можете да се регистрирате како администратор' })
  type: UserType;

  @ValidateIf((o) => o.type === UserType.Individual)
  @IsString({ message: 'Телефонот е задолжителен' })
  @Matches(/^\+\d{1,4}\d{6,15}$/, { message: 'Телефонот мора да биде во формат +код држава (1-4 цифри) + број (6-15 цифри)' })
  phone?: string;

  @ValidateIf((o) => o.type === UserType.Individual)
  @IsString({ message: 'Името е задолжително' })
  @MinLength(2, { message: 'Името мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Името не може да биде подолго од 50 карактери' })
  firstName?: string;

  @ValidateIf((o) => o.type === UserType.Individual)
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Презимето мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Презимето не може да биде подолго од 50 карактери' })
  lastName?: string;

  @ValidateIf((o) => o.type === UserType.Business)
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Името на компанијата мора да содржи минимум 2 карактери' })
  @MaxLength(100, { message: 'Името на компанијата не може да биде подолго од 100 карактери' })
  companyName?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  viber?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  telegram?: boolean;

  @IsNotEmpty({ message: 'Мора да ги прифатите условите за користење' })
  @IsBoolean({ message: 'termsAccepted мора да биде булова вредност' })
  termsAccepted: boolean;
}
