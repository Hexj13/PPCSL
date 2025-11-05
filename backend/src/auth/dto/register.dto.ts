import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotEquals,
  ValidateIf,
} from 'class-validator';

import { UserType, UserType as UserTypeEnum } from '../../common/types';

export class RegisterDto {
  @ValidateIf((o) => o.type === UserTypeEnum.Business)
  @IsNotEmpty({ message: 'Email е задолжителен за правно лице' })
  @ValidateIf(
    (o) => o.type === UserTypeEnum.Business || (o.type === UserTypeEnum.Individual && o.email),
  )
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
  @NotEquals(UserTypeEnum.Admin, { message: 'Не можете да се регистрирате како администратор' })
  type: UserType;

  @ValidateIf((o) => o.type === UserTypeEnum.Individual)
  @IsString({ message: 'Телефонот е задолжителен' })
  @Matches(/^\+\d{1,4}\d{6,15}$/, {
    message: 'Телефонот мора да биде во формат +код држава (1-4 цифри) + број (6-15 цифри)',
  })
  phone?: string;

  @ValidateIf((o) => o.type === UserTypeEnum.Individual)
  @IsString({ message: 'Името е задолжително' })
  @MinLength(2, { message: 'Името мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Името не може да биде подолго од 50 карактери' })
  firstName?: string;

  @IsOptional()
  @ValidateIf((o) => o.lastName != null && o.lastName !== '')
  @IsString()
  @MinLength(2, { message: 'Презимето мора да содржи минимум 2 карактери' })
  @MaxLength(50, { message: 'Презимето не може да биде подолго од 50 карактери' })
  lastName?: string;

  @ValidateIf((o) => o.type === UserTypeEnum.Business)
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
