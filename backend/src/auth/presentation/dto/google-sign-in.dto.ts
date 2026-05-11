import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleSignInDto {
  @ApiProperty({ description: 'Google ID token (JWT) from GIS' })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiProperty({ required: false, enum: ['Individual', 'Business'] })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
