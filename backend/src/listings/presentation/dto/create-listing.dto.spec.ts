import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ListingCategory } from '../../../common/types';

import { CreateListingDto } from './create-listing.dto';

const vehiclePayload = {
  brand_id: '00000000-0000-0000-0000-000000000001',
  model_id: '00000000-0000-0000-0000-000000000002',
  year: 2020,
  body_type: 'sedan',
  fuel_type: 'petrol',
  transmission: 'automatic',
  drive_type: 'fwd',
  engine_volume: 2,
  horsepower: 150,
  mileage: 1000,
  color: 'black',
  steering_wheel: 'left',
  condition: 'used',
};

const tirePayload = {
  brand_id: '00000000-0000-0000-0000-000000000003',
  tire_vehicle_type: 'car',
  season: 'summer',
  condition: 'used',
  width_mm: 205,
  aspect_ratio: 55,
  diameter_inch: 16,
  quantity: 4,
};

function getImagesConstraints(dto: CreateListingDto): Record<string, string> | undefined {
  return validateSync(dto).find((error) => error.property === 'images')?.constraints;
}

describe('CreateListingDto', () => {
  it('requires at least two images for vehicle listings', () => {
    const dto = plainToInstance(CreateListingDto, {
      category: ListingCategory.Vehicle,
      price: 1,
      city: 'City',
      vehicle: vehiclePayload,
    });

    expect(getImagesConstraints(dto)).toEqual({
      listingImages: 'validation.listingImagesMinVehicle|2',
    });
  });

  it('requires at least one image for tire listings', () => {
    const dto = plainToInstance(CreateListingDto, {
      category: ListingCategory.Tire,
      price: 1,
      city: 'City',
      tire: tirePayload,
    });

    expect(getImagesConstraints(dto)).toEqual({
      listingImages: 'validation.listingImagesMinTire|1',
    });
  });

  it('infers tire category from tire payload when category is omitted', () => {
    const dto = plainToInstance(CreateListingDto, {
      price: 1,
      city: 'City',
      tire: tirePayload,
    });

    expect(getImagesConstraints(dto)).toEqual({
      listingImages: 'validation.listingImagesMinTire|1',
    });
  });

  it('rejects more than twenty images for vehicle listings', () => {
    const dto = plainToInstance(CreateListingDto, {
      category: ListingCategory.Vehicle,
      price: 1,
      city: 'City',
      images: Array.from({ length: 21 }, (_, index) => `image-${index}`),
      vehicle: vehiclePayload,
    });

    expect(getImagesConstraints(dto)).toEqual({
      listingImages: 'validation.listingImagesMax|20',
    });
  });
});
