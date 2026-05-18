import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({ example: '123456', description: 'SMS verification code' })
  @IsNotEmpty({ message: 'errors.codeRequired' })
  @IsString()
  @Length(6, 6, { message: 'validation.codeLength' })
  @Matches(/^\d+$/, { message: 'validation.codeDigits' })
  code: string;
}
