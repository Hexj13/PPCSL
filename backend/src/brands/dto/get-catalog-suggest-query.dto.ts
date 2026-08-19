import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { CATALOG_SUGGEST_LIMIT } from '../catalog-suggest/catalog-suggest.types';
import { hasMinSuggestQueryChars } from '../catalog-suggest/parse-catalog-suggest-query';

@ValidatorConstraint({ name: 'suggestQueryMinChars', async: false })
class SuggestQueryMinCharsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && hasMinSuggestQueryChars(value);
  }

  defaultMessage(): string {
    return 'validation.suggestQueryMinChars';
  }
}

export class GetCatalogSuggestQueryDto {
  @ApiProperty({ example: 'ford', description: 'Catalog suggest query (min 3 letters or digits)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'validation.string' })
  @MaxLength(64, { message: 'validation.suggestQueryMaxLength' })
  @Matches(/^[\p{L}\p{N}\s-]+$/u, { message: 'validation.suggestQueryChars' })
  @Validate(SuggestQueryMinCharsConstraint)
  q!: string;

  @ApiPropertyOptional({ enum: ['car', 'truck', 'moto'], example: 'car' })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto'], { message: 'validation.vehicleTypeCategoryEnum' })
  vehicleType?: 'car' | 'truck' | 'moto';

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CATALOG_SUGGEST_LIMIT,
    default: CATALOG_SUGGEST_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CATALOG_SUGGEST_LIMIT)
  limit?: number;
}
