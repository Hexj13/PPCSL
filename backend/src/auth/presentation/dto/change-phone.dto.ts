import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { IsPhone } from '../../../common/decorators/is-phone.decorator';

export class ChangePhoneRequestDto {
  @ApiProperty({
    example: '+37370123456',
    description: 'New phone number',
  })
  @IsString({ message: 'errors.phoneRequired' })
  @IsPhone()
  phone: string;
}

export class ChangePhoneVerifyDto {
  @ApiProperty({
    example: '+37370123456',
    description: 'New phone number',
  })
  @IsString({ message: 'errors.phoneRequired' })
  @IsPhone()
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'SMS verification code',
  })
  @IsString({ message: 'errors.codeRequired' })
  code: string;
}
