import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Email verification token',
  })
  @IsNotEmpty({ message: 'validation.verifyEmailTokenRequired' })
  @IsString({ message: 'validation.verifyEmailTokenString' })
  token: string;
}
