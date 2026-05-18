import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

import { IsPhone } from '../../../common/decorators/is-phone.decorator';

export class VerifySmsDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit verification code',
  })
  @IsNotEmpty({ message: 'errors.codeRequired' })
  @IsString({ message: 'validation.string' })
  @Length(6, 6, { message: 'validation.codeLength' })
  @Matches(/^\d{6}$/, { message: 'validation.codeDigits' })
  code: string;

  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'errors.phoneRequired' })
  @IsString({ message: 'validation.string' })
  @IsPhone()
  phone: string;
}
