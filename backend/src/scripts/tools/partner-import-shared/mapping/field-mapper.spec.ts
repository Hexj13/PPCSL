import { BodyType, Currency, ListingStatus, RegistrationType } from '../../../../common/types';

import type { BuildListingPayloadInput, ParsedPdpData } from '../listing-types';
import { buildCreateListingPayload } from './field-mapper';

function minimalParsed(overrides: Partial<ParsedPdpData>): ParsedPdpData {
  return {
    sourceListingId: '1',
    sourceUrl: 'https://example.com/1',
    canonicalUrl: 'https://example.com/1',
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
});
