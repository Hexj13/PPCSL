import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';

import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateListingDto {
  @ApiPropertyOptional({
    example: '2020 BMW 3 Series Sedan - Updated',
    description: 'Listing title',
  })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 24000,
    description: 'Price',
  })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: 'Bitola',
    description: 'City',
  })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: 'Updated description with new information.',
    description: 'Listing description',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['http://localhost:4000/uploads/new-image.webp'],
    description: 'Array of image URLs',
    type: [String],
  })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Mark listing as urgent',
  })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({
    example: 'WBA3A5G59CNP12345',
    description: 'Vehicle Identification Number',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
  })
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'VIN мора да биде точно 17 карактери' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, {
    message: 'VIN мора да содржи само букви и бројки (без I, O, Q)',
  })
  vin?: string;

  @ApiPropertyOptional({
    type: () => CreateVehicleDto,
    description: 'Vehicle details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;
}
