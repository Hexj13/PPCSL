import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResendEmailVerificationDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Expired email verification token',
  })
  @IsNotEmpty({ message: 'validation.verifyEmailTokenRequired' })
  @IsString({ message: 'validation.verifyEmailTokenString' })
  token: string;
}
