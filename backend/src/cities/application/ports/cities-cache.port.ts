export const CITIES_CACHE = Symbol('CITIES_CACHE');

export interface City {
  name: string;
  nameEn: string;
  nameRu?: string;
}

export interface ICitiesCache {
  getAll(): Promise<City[] | null>;
  setAll(cities: City[]): Promise<void>;
}
