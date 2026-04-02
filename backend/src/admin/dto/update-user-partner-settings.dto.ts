import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateUserPartnerSettingsDto {
  @ApiProperty({ description: 'Whether the user is a platform partner' })
  @IsBoolean()
  isPlatformPartner: boolean;

  @ApiProperty({
    description: 'Free promotion balance for partner users',
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  freePromotionBalance?: number;
}
