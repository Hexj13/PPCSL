import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email or phone number',
  })
  @IsString({ message: 'validation.loginIdentifierRequired' })
  login: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password',
  })
  @IsString()
  password: string;
}
