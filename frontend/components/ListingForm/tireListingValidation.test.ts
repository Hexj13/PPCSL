import type { TireListingFormData } from './tireListingFormTypes';
import { runTireListingValidation } from './tireListingValidation';

const t = (key: string) => key;
const toast = { error: jest.fn() };

function baseForm(overrides: Partial<TireListingFormData> = {}): TireListingFormData {
  return {
    tire_vehicle_type: 'car',
    brand_id: 'brand-1',
    model_id: 'model-1',
    season: 'summer',
    condition: 'new',
    width_mm: '205',
    aspect_ratio: '55',
    diameter_inch: '16',
    quantity: '4',
    load_index: '',
    speed_index: '',
    studded: false,
    run_flat: false,
    reinforced_xl: false,
    spare_donut: false,
    tubeless: false,
    acoustic: false,
    price: '1000',
    currency: 'EUR',
    city: 'Chisinau',
    negotiable: false,
    description_ro: '',
    description_ru: '',
    status: 'draft',
    images: ['img-1'],
    cover_blur_hash: '',
    image_blur_hashes: [null],
    urgent: false,
    assignedUserId: '',
    ...overrides,
  };
}

describe('runTireListingValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns invalid when brand is missing', () => {
    const result = runTireListingValidation(baseForm({ brand_id: '' }), t, toast);
    expect(result.isValid).toBe(false);
    expect(result.errors.brand_id).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });

  it('rejects studded tires outside winter season', () => {
    const result = runTireListingValidation(
      baseForm({ studded: true, season: 'summer' }),
      t,
      toast,
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.studded).toBe(true);
  });

  it('returns valid for a minimal complete tire listing', () => {
    const result = runTireListingValidation(baseForm(), t, toast);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(toast.error).not.toHaveBeenCalled();
  });
});
