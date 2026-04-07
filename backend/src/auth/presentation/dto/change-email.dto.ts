import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangeEmailRequestDto {
  @ApiProperty({
    example: 'new.email@example.com',
    description: 'New email address',
  })
  @IsEmail({}, { message: 'validation.emailInvalid' })
  newEmail!: string;
}

export class ChangeEmailConfirmDto {
  @ApiProperty({
    example: 'jwt-token',
    description: 'Email change confirmation token',
  })
  @IsString()
  @MinLength(1)
  token!: string;
}
