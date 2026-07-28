import { Availability } from '../../../../common/constants';
import { BodyType, Currency, ListingStatus, RegistrationType } from '../../../../common/types';

import type { BuildListingPayloadInput, ParsedPdpData } from '../listing-types';
import { buildCreateListingPayload, shouldIncludeSeatsInPayload } from './field-mapper';

function minimalParsed(overrides: Partial<ParsedPdpData>): ParsedPdpData {
  return {
    sourceListingId: '1',
    sourceUrl: 'https://example.com/1',
    canonicalUrl: 'https://example.com/1',
    sourceStatus: 'active',
    creditAvailable: false,
    images: ['https://img/a.jpg', 'https://img/b.jpg'],
    equipmentOptions: [],
    equipmentKeys: [],
    warnings: [],
    year: 2020,
    price: 10000,
    currency: Currency.EUR,
    ...overrides,
  };
}

function buildInput(
  parsedPartial: Partial<ParsedPdpData>,
  extra: Partial<Omit<BuildListingPayloadInput, 'parsed'>> = {},
): BuildListingPayloadInput {
  return {
    parsed: minimalParsed(parsedPartial),
    ownerUserId: '00000000-0000-4000-8000-000000000001',
    status: ListingStatus.Paused,
    city: 'Chișinău',
    registrationType: RegistrationType.Local,
    defaultHorsepower: 150,
    resolvedBrandId: 'brand-id',
    resolvedModelId: 'model-id',
    mappedEnums: {
      bodyType: BodyType.SUV,
    },
    horsepower: 150,
    ...extra,
  };
}

describe('buildCreateListingPayload', () => {
  it('includes doors when vehicleType is car', () => {
    const payload = buildCreateListingPayload(buildInput({ doors: 4 }, { vehicleType: 'car' }));
    expect(payload.vehicle.doors).toBe(4);
  });

  it('includes doors when vehicleType is omitted (legacy imports)', () => {
    const payload = buildCreateListingPayload(buildInput({ doors: 5 }));
    expect(payload.vehicle.doors).toBe(5);
  });

  it('omits doors for truck vehicleType', () => {
    const payload = buildCreateListingPayload(buildInput({ doors: 4 }, { vehicleType: 'truck' }));
    expect(payload.vehicle.doors).toBeUndefined();
  });

  it('omits doors for moto vehicleType', () => {
    const payload = buildCreateListingPayload(buildInput({ doors: 2 }, { vehicleType: 'moto' }));
    expect(payload.vehicle.doors).toBeUndefined();
  });

  it('includes image_blur_hashes when provided', () => {
    const hashes = ['UBF~bx00', 'LKO2?U%2'];
    const payload = buildCreateListingPayload(buildInput({}, { imageBlurHashes: hashes }));
    expect(payload.image_blur_hashes).toEqual(hashes);
  });

  it('includes image_blur_hashes with null entries aligned to images', () => {
    const hashes = ['UBF~bx00', null];
    const payload = buildCreateListingPayload(
      buildInput(
        { images: ['https://img/a.jpg', 'https://img/b.jpg'] },
        { imageBlurHashes: hashes },
      ),
    );
    expect(payload.image_blur_hashes).toEqual(hashes);
    expect(payload.images).toHaveLength(2);
  });

  it('omits image_blur_hashes when not provided', () => {
    const payload = buildCreateListingPayload(buildInput({}));
    expect(payload.image_blur_hashes).toBeUndefined();
  });

  it('sends description_ro and description_ru when both are present', () => {
    const payload = buildCreateListingPayload(
      buildInput({
        description_ro: '<p>RO text</p>',
        description_ru: '<p>RU text</p>',
        description: '<p>RO text</p>',
      }),
    );
    expect(payload.description_ro).toBe('<p>RO text</p>');
    expect(payload.description_ru).toBe('<p>RU text</p>');
    expect(payload.description).toBeUndefined();
  });

  it('maps legacy-only description to description_ro for API compatibility', () => {
    const payload = buildCreateListingPayload(
      buildInput({
        description: 'Legacy description text',
      }),
    );
    expect(payload.description_ro).toBe('Legacy description text');
    expect(payload.description_ru).toBeUndefined();
    expect(payload.description).toBeUndefined();
  });

  it('includes availability when parsed', () => {
    const payload = buildCreateListingPayload(buildInput({ availability: Availability.OnOrder }));
    expect(payload.availability).toBe(Availability.OnOrder);
  });

  it('includes vehicle country_of_origin, owners_count, and interior_color', () => {
    const payload = buildCreateListingPayload(
      buildInput(
        {
          countryOfOrigin: 'de',
          ownersCount: 1,
          interiorColorRaw: 'Bej',
        },
        {
          mappedEnums: {
            bodyType: BodyType.SUV,
            interiorColor: 'beige',
          },
        },
      ),
    );
    expect(payload.vehicle.country_of_origin).toBe('DE');
    expect(payload.vehicle.owners_count).toBe(1);
    expect(payload.vehicle.interior_color).toBe('beige');
  });

  it('omits invalid country_of_origin and owners_count', () => {
    const payload = buildCreateListingPayload(
      buildInput({
        countryOfOrigin: 'Germany',
        ownersCount: 101,
      }),
    );
    expect(payload.vehicle.country_of_origin).toBeUndefined();
    expect(payload.vehicle.owners_count).toBeUndefined();
  });

  it('maps interior_color from interiorColorRaw when mappedEnums omit it', () => {
    const payload = buildCreateListingPayload(
      buildInput({
        interiorColorRaw: 'Negru',
      }),
    );
    expect(payload.vehicle.interior_color).toBe('black');
  });

  it('includes seats for car when in range 1-9', () => {
    const payload = buildCreateListingPayload(buildInput({ seats: 5 }, { vehicleType: 'car' }));
    expect(payload.vehicle.seats).toBe(5);
  });

  it('includes seats for truck when in range 1-9', () => {
    const payload = buildCreateListingPayload(buildInput({ seats: 3 }, { vehicleType: 'truck' }));
    expect(payload.vehicle.seats).toBe(3);
  });

  it('omits seats for moto when greater than 4', () => {
    const payload = buildCreateListingPayload(buildInput({ seats: 5 }, { vehicleType: 'moto' }));
    expect(payload.vehicle.seats).toBeUndefined();
  });

  it('includes seats for moto when 1-4', () => {
    const payload = buildCreateListingPayload(buildInput({ seats: 2 }, { vehicleType: 'moto' }));
    expect(payload.vehicle.seats).toBe(2);
  });
});

describe('shouldIncludeSeatsInPayload', () => {
  it('rejects out-of-range seats', () => {
    expect(shouldIncludeSeatsInPayload('car', 0)).toBe(false);
    expect(shouldIncludeSeatsInPayload('car', 10)).toBe(false);
  });
});
