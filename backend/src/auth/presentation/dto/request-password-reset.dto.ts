import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { IsPhone } from '../../../common/decorators/is-phone.decorator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number in international format',
  })
  @IsString({ message: 'validation.string' })
  @IsPhone()
  phone: string;
}
