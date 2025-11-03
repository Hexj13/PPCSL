import { CreateListingDto } from './create-listing.dto';
import { IsOptional, IsBoolean, ValidateNested, IsString, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateListingDto {
  @IsOptional()
  title?: string;

  @IsOptional()
  price?: number;

  @IsOptional()
  city?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  images?: string[];

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN мора да биде точно 17 карактери' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'VIN мора да содржи само букви и бројки (без I, O, Q)',
  })
  vin?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;
}
