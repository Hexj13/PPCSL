import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class TogglePromotionDto {
  @IsBoolean()
  @ApiProperty({ description: 'Promotion status' })
  is_promoted: boolean;

  @ValidateIf((o) => o.days !== null)
  @IsOptional()
  @IsInt()
  @Min(1)
  @IsIn([1, 7, 14, 30])
  @ApiProperty({
    description:
      'Number of days for promotion (1, 7, 14, or 30). Required if is_promoted is true for users. null means unlimited (admin only).',
    required: false,
  })
  days?: number | null;

  @IsOptional()
  @IsIn(['default', 'partner_balance'])
  @ApiProperty({
    description:
      'Promotion source for user flow. partner_balance enables unlimited promotion using partner balance.',
    required: false,
    enum: ['default', 'partner_balance'],
  })
  source?: 'default' | 'partner_balance';
}
