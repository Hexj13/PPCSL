import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class DevTelegramSignInDto {
  @ApiPropertyOptional({ enum: ['Individual', 'Business'] })
  @IsOptional()
  @IsIn(['Individual', 'Business'], { message: 'validation.userTypeEnum' })
  type?: 'Individual' | 'Business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
