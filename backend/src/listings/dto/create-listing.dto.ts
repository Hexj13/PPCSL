import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';
import { ListingStatus, Currency } from '../../common/types';

export class CreateListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999)
  price: number;

  @IsOptional()
  @IsEnum(Currency, { message: 'Валутата мора да биде MKD или EUR' })
  currency?: Currency;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2, {
    message: 'Минимум 2 слики',
  })
  @ArrayMaxSize(20, {
    message: 'Максимум 20 слики',
  })
  images?: string[];

  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Статусот мора да биде Active, Paused или Closed' })
  status?: ListingStatus;

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

  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle: CreateVehicleDto;
}
