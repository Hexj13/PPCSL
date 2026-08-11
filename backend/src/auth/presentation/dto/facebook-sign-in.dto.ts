import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class FacebookSignInDto {
  @ApiProperty({ description: 'Facebook user access token from JS SDK' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(4096, { message: 'validation.facebookAccessTokenMaxLength' })
  accessToken: string;

  @ApiProperty({ required: false, enum: ['Individual', 'Business'] })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
