import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: '+37370123456',
    description: 'Phone number in international format',
  })
  @IsString({ message: 'validation.string' })
  @Matches(/^[+]?[0-9\s()-]{8,}$/, {
    message: 'validation.phone',
  })
  phone: string;
}
