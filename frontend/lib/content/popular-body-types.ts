export type PopularBodyTypeCar = 'Hatchback' | 'Wagon' | 'SUV' | 'Minivan' | 'Sedan' | 'Pickup';

export const POPULAR_BODY_TYPES_CAR: Array<{
  value: PopularBodyTypeCar;
  image: string;
}> = [
  { value: 'SUV', image: '/popular_body_types/cars/SUV.webp' },
  { value: 'Sedan', image: '/popular_body_types/cars/SEDAN.webp' },
  { value: 'Wagon', image: '/popular_body_types/cars/WAGON.webp' },
  { value: 'Hatchback', image: '/popular_body_types/cars/HATCHBACK.webp' },
  { value: 'Minivan', image: '/popular_body_types/cars/VAN.webp' },
  { value: 'Pickup', image: '/popular_body_types/cars/PICKUP.webp' },
];

export const POPULAR_BODY_TYPES_TRUCK: Array<{ value: string; image: string }> = [
  { value: 'Van', image: '/popular_body_types/trucks/furgon.webp' },
  { value: 'Truck', image: '/popular_body_types/trucks/TRUCK.webp' },
  { value: 'SemiTruck', image: '/popular_body_types/trucks/SEMITRUCK.webp' },
  { value: 'SpecialEquipment', image: '/popular_body_types/trucks/SPECIAL.webp' },
  { value: 'Tractor', image: '/popular_body_types/trucks/TRACTOR.webp' },
  { value: 'Bus', image: '/popular_body_types/trucks/BUS.webp' },
];

export const POPULAR_BODY_TYPES_MOTO: Array<{ value: string; image: string | null }> = [
  { value: 'Naked', image: '/popular_body_types/moto/NAKED.webp' },
  { value: 'Sport', image: '/popular_body_types/moto/SPORT.webp' },
  { value: 'Touring', image: '/popular_body_types/moto/TURING.webp' },
  { value: 'Adventure', image: '/popular_body_types/moto/ADVENTURE.webp' },
  { value: 'Scooter', image: '/popular_body_types/moto/SCOUTER.webp' },
  { value: 'ATV', image: '/popular_body_types/moto/ATV.webp' },
];

export function getPopularBodyTypes(vehicleType: 'car' | 'truck' | 'moto' = 'car') {
  if (vehicleType === 'truck') return POPULAR_BODY_TYPES_TRUCK;
  if (vehicleType === 'moto') return POPULAR_BODY_TYPES_MOTO;
  return POPULAR_BODY_TYPES_CAR;
}
