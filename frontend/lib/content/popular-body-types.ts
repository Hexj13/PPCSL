export type PopularBodyTypeCar =
  | 'Hatchback'
  | 'Wagon'
  | 'SUV'
  | 'Minivan'
  | 'Sedan'
  | 'Convertible';

export const POPULAR_BODY_TYPES_CAR: Array<{
  value: PopularBodyTypeCar;
  image: string;
}> = [
  { value: 'Hatchback', image: '/popular_body_types/cars/HATCHBACK.png' },
  { value: 'Wagon', image: '/popular_body_types/cars/WAGON.png' },
  { value: 'SUV', image: '/popular_body_types/cars/SUV.png' },
  { value: 'Minivan', image: '/popular_body_types/cars/VAN.png' },
  { value: 'Sedan', image: '/popular_body_types/cars/SEDAN.png' },
  { value: 'Convertible', image: '/popular_body_types/cars/CABRIO.png' },
];

export const POPULAR_BODY_TYPES_TRUCK: Array<{ value: string; image: string }> = [
  { value: 'Van', image: '/popular_body_types/trucks/furgon.png' },
  { value: 'Truck', image: '/popular_body_types/trucks/TRUCK.png' },
  { value: 'SemiTruck', image: '/popular_body_types/trucks/SEMITRUCK.png' },
  { value: 'SpecialEquipment', image: '/popular_body_types/trucks/SPECIAL.png' },
  { value: 'Tractor', image: '/popular_body_types/trucks/TRACTOR.png' },
  { value: 'Bus', image: '/popular_body_types/trucks/BUS.png' },
];

export const POPULAR_BODY_TYPES_MOTO: Array<{ value: string; image: string | null }> = [
  { value: 'Naked', image: '/popular_body_types/moto/NAKED.png' },
  { value: 'Sport', image: '/popular_body_types/moto/SPORT.png' },
  { value: 'Touring', image: '/popular_body_types/moto/TURING.png' },
  { value: 'Adventure', image: '/popular_body_types/moto/ADVENTURE.png' },
  { value: 'Scooter', image: '/popular_body_types/moto/SCOUTER.png' },
  { value: 'ATV', image: '/popular_body_types/moto/ATV.png' },
];

export function getPopularBodyTypes(vehicleType: 'car' | 'truck' | 'moto' = 'car') {
  if (vehicleType === 'truck') return POPULAR_BODY_TYPES_TRUCK;
  if (vehicleType === 'moto') return POPULAR_BODY_TYPES_MOTO;
  return POPULAR_BODY_TYPES_CAR;
}
