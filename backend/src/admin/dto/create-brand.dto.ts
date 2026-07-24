import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { POPULAR_BRAND_COUNTRIES } from '../../common/constants';

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['car', 'truck', 'moto', 'tire'], { each: true })
  vehicleTypes: ('car' | 'truck' | 'moto' | 'tire')[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsIn([...POPULAR_BRAND_COUNTRIES])
  popularCountry?: (typeof POPULAR_BRAND_COUNTRIES)[number] | null;
}
