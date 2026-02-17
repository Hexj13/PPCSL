import type { Brand, City, Listing, VehicleModel } from '@/lib/api';
import * as api from '@/lib/api';
import { Currency } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';

export const mockBrands: Brand[] = [
  { id: 'brand-1', name: 'Toyota', order: 0 },
  { id: 'brand-2', name: 'BMW', order: 1 },
];

export const mockModels: VehicleModel[] = [
  { id: 'model-1', name: 'Camry', brand_id: 'brand-1', order: 0 },
  { id: 'model-2', name: 'Corolla', brand_id: 'brand-1', order: 1 },
];

export const mockCities: City[] = [
  { name: 'Chișinău', nameEn: 'Chișinău' },
  { name: 'Bitola', nameEn: 'Bitola' },
];

export const mockListing = {
  id: 'listing-1',
  title: 'Test Car',
  price: 10000,
  currency: Currency.EUR,
  city: 'Chișinău',
  description: 'Test description',
  status: 'Active',
  images: [
    'http://localhost:4000/uploads/image1.webp',
    'http://localhost:4000/uploads/image2.webp',
  ],
  urgent: false,
  is_new: false,
  vin: '1HGBH41JXMN109186',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: 150,
  is_registered: false,
  registration_expires_at: undefined,
  vehicle: {
    id: 'vehicle-1',
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    engine_displ_l: 2.0,
    mileage_km: 50000,
    fuel: 'Petrol',
    transmission: 'Manual',
    drive_type: 'FWD',
    body_type: 'Sedan',
    color: 'black',
    doors: 4,
    brand: { id: 'brand-1', name: 'Toyota', order: 0 },
    model: { id: 'model-1', name: 'Camry', brand_id: 'brand-1', order: 0 },
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_updated_at: '2024-01-01T00:00:00Z',
  views: 0,
  user_id: 'user-1',
};

export function setupListingFormMocks(): void {
  (useAuthStore as unknown as jest.Mock).mockReturnValue({
    user: { id: 'user-1' },
    isInitialized: true,
    token: 'test-token',
    setAuth: jest.fn(),
    logout: jest.fn(),
    initAuth: jest.fn(),
  });
  (api.brandsApi.getAll as jest.Mock).mockResolvedValue({ data: mockBrands });
  (api.citiesApi.getAll as jest.Mock).mockResolvedValue({ data: mockCities });
  (api.brandsApi.getModels as jest.Mock).mockResolvedValue({ data: mockModels });
  (api.listingsApi.update as jest.Mock).mockResolvedValue({ data: mockListing as Listing });
  (api.listingsApi.create as jest.Mock).mockResolvedValue({ data: mockListing as Listing });
  (api.uploadApi.uploadImage as jest.Mock).mockResolvedValue({
    data: {
      url: 'http://localhost:4000/uploads/test-image.webp',
      path: '/uploads/test-image.webp',
    },
  });
}

type ScreenLike = { getByTestId: (id: string) => HTMLElement };

export function getPriceInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-price');
}

export function getEngineDisplacementInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-engine-displacement');
}

export function getMileageInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-mileage');
}

export function getHorsepowerInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-horsepower');
}

export function getPowerKwInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-power-kw');
}

export function getRegisteredCheckbox(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-is-registered');
}

export function getUrgentCheckbox(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-urgent');
}

export function getIsNewCheckbox(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-is-new');
}

export function getPhotosFileInput(screen: ScreenLike): HTMLElement {
  return screen.getByTestId('listing-form-photos-input');
}
