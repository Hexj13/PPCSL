import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Email verification token',
  })
  @IsNotEmpty({ message: 'Токенот е задолжителен' })
  @IsString({ message: 'Токенот мора да биде стринг' })
  token: string;
}
