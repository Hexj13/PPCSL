import { ConditionType, Currency } from '../../../../common/constants';

import type { AdvertRaw } from './advert-types';
import { normalize999mdAdvert } from './pdp-normalizer';

describe('normalize999mdAdvert', () => {
  it('maps core vehicle fields, price, images, and description from GraphQL-shaped advert', () => {
    const advert: AdvertRaw = {
      id: '103135906',
      title: 'Renault Captur',
      subCategory: {
        id: 659,
        url: 'transport/cars',
        title: { translated: 'Autoturisme' },
      },
      groups: [
        {
          title: 'General',
          controls: [
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Marcă',
              option_title: '',
              feature: {
                id: 20,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Renault', value: 8 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Model',
              option_title: '',
              feature: {
                id: 21,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Captur', value: 19268 },
              },
            },
            {
              type: 'CONTROL_TYPE_TEXT',
              title: 'VIN-cod',
              option_title: '',
              feature: {
                id: 2512,
                type: 'FEATURE_TEXT',
                value: 'vf1rjb00266732764',
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Stare',
              option_title: '',
              feature: {
                id: 593,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Cu rulaj', value: 18668 },
              },
            },
          ],
        },
        {
          title: 'Particularități',
          controls: [
            {
              type: 'CONTROL_TYPE_TEXTBOX_NUMERIC',
              title: 'An de fabricație',
              option_title: '',
              feature: { id: 19, type: 'FEATURE_INT', value: 2021 },
            },
            {
              type: 'CONTROL_TYPE_TEXTBOX_NUMERIC_MEASUREMENT',
              title: 'Rulaj',
              option_title: '',
              feature: {
                id: 104,
                type: 'FEATURE_INT_UNIT',
                value: { unit: 'UNIT_KILOMETER', value: 170000 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Motor',
              option_title: '',
              feature: {
                id: 2553,
                type: 'FEATURE_OPTIONS',
                value: { translated: '1.5 l', value: 43679 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Tip combustibil',
              option_title: '',
              feature: {
                id: 151,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Diesel', value: 24 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Cutie de viteze',
              option_title: '',
              feature: {
                id: 101,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Automată', value: 16 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Tip tracțiune',
              option_title: '',
              feature: {
                id: 108,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Din față', value: 5 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Tip caroserie',
              option_title: '',
              feature: {
                id: 102,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Crossover', value: 74 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Număr uși',
              option_title: '',
              feature: {
                id: 851,
                type: 'FEATURE_OPTIONS',
                value: { translated: '5', value: 19086 },
              },
            },
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Culoare',
              option_title: '',
              feature: {
                id: 17,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Gri', value: 50 },
              },
            },
          ],
        },
        {
          title: 'Preț și regiune',
          controls: [
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Regiune',
              option_title: '',
              feature: {
                id: 7,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Chișinău mun.', value: 12900 },
              },
            },
            {
              type: 'CONTROL_TYPE_PRICE',
              title: 'Preț',
              option_title: '',
              feature: {
                id: 2,
                type: 'FEATURE_PRICE',
                value: {
                  bargain: false,
                  down_payment: 1300,
                  measurement: 'UNIT_EUR',
                  mode: 'PM_FIXED',
                  unit: 'UNIT_EUR',
                  value: 13390,
                },
              },
            },
          ],
        },
        {
          title: 'General',
          controls: [
            {
              type: 'CONTROL_TYPE_TEXTAREA_TEXT',
              title: 'Textul anunțului',
              option_title: '',
              feature: {
                id: 13,
                type: 'FEATURE_BODY',
                value: { ro: 'Short description', translated: 'Short description' },
              },
            },
          ],
        },
        {
          title: 'Media',
          controls: [
            {
              type: 'CONTROL_TYPE_UPLOAD_IMAGES',
              title: 'Fotografii',
              option_title: '',
              feature: {
                id: 14,
                type: 'FEATURE_IMAGES',
                value: ['a.jpg', 'b.jpg'],
              },
            },
          ],
        },
        {
          title: 'Securitate',
          controls: [
            {
              type: 'CONTROL_TYPE_CHECK_BOX',
              title: 'ABS',
              option_title: '',
              feature: { id: 999, type: 'FEATURE_BOOLEAN', value: true },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/103135906',
      canonicalUrl: 'https://999.md/ro/103135906',
      imageBaseUrl: 'https://i.simpalsmedia.com/999.md/BoardImages/900x900',
    });

    expect(parsed.sourceListingId).toBe('103135906');
    expect(parsed.brand).toBe('Renault');
    expect(parsed.model).toBe('Captur');
    expect(parsed.year).toBe(2021);
    expect(parsed.mileageKm).toBe(170000);
    expect(parsed.engineVolumeL).toBeCloseTo(1.5, 5);
    expect(parsed.fuelRaw).toBe('Diesel');
    expect(parsed.gearboxRaw).toBe('Automată');
    expect(parsed.driveTypeRaw).toBe('Din față');
    expect(parsed.bodyRaw).toBe('Crossover');
    expect(parsed.doors).toBe(5);
    expect(parsed.vin).toBe('VF1RJB00266732764');
    expect(parsed.condition).toBe(ConditionType.Undamaged);
    expect(parsed.colorRaw).toBe('gri');
    expect(parsed.city).toBe('Chișinău mun.');
    expect(parsed.price).toBe(13390);
    expect(parsed.currency).toBe(Currency.EUR);
    expect(parsed.creditAvailable).toBe(true);
    expect(parsed.downPaymentAmount).toBe(1300);
    expect(parsed.description).toBe('Short description');
    expect(parsed.images).toEqual([
      'https://i.simpalsmedia.com/999.md/BoardImages/900x900/a.jpg',
      'https://i.simpalsmedia.com/999.md/BoardImages/900x900/b.jpg',
    ]);
    expect(parsed.equipmentOptions.some((o) => o.slug === 'abs')).toBe(true);
  });

  it('accepts MDL price and currency when unit is UNIT_MDL', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'Preț și regiune',
          controls: [
            {
              type: 'CONTROL_TYPE_PRICE',
              title: 'Preț',
              option_title: '',
              feature: {
                id: 2,
                type: 'FEATURE_PRICE',
                value: {
                  bargain: false,
                  measurement: 'UNIT_MDL',
                  unit: 'UNIT_MDL',
                  value: 250000,
                },
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.price).toBe(250000);
    expect(parsed.currency).toBe(Currency.MDL);
    expect(parsed.warnings).toEqual([]);
  });

  it('ignores price for unsupported currencies (e.g. USD) and records PRICE_UNSUPPORTED_CURRENCY', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'Preț și regiune',
          controls: [
            {
              type: 'CONTROL_TYPE_PRICE',
              title: 'Preț',
              option_title: '',
              feature: {
                id: 2,
                type: 'FEATURE_PRICE',
                value: {
                  bargain: false,
                  measurement: 'UNIT_USD',
                  unit: 'UNIT_USD',
                  value: 10000,
                },
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.price).toBeUndefined();
    expect(parsed.currency).toBeUndefined();
    expect(parsed.warnings).toContain('PRICE_UNSUPPORTED_CURRENCY:UNIT_USD');
  });

  it('records DOORS_PARSE warning when door count is outside API range', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'Particularități',
          controls: [
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Număr uși',
              option_title: '',
              feature: {
                id: 851,
                type: 'FEATURE_OPTIONS',
                value: { translated: '10', value: 1 },
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.doors).toBeUndefined();
    expect(parsed.warnings.some((w) => w.startsWith('DOORS_PARSE:'))).toBe(true);
  });

  it('records VIN_PARSE warning when VIN is not 17 valid characters', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'General',
          controls: [
            {
              type: 'CONTROL_TYPE_TEXT',
              title: 'VIN-cod',
              option_title: '',
              feature: {
                id: 2512,
                type: 'FEATURE_TEXT',
                value: 'TOO_SHORT',
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.vin).toBeUndefined();
    expect(parsed.warnings.some((w) => w.startsWith('VIN_PARSE:'))).toBe(true);
  });

  it('maps Stare La dezmembrare to ForParts', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'General',
          controls: [
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Stare',
              option_title: '',
              feature: {
                id: 593,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'La dezmembrare', value: 20666 },
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.condition).toBe(ConditionType.ForParts);
  });

  it('records STARE_UNKNOWN when Stare option id is not mapped', () => {
    const advert: AdvertRaw = {
      id: '1',
      title: 'X',
      groups: [
        {
          title: 'General',
          controls: [
            {
              type: 'CONTROL_TYPE_DROP_DOWN_OPTIONS',
              title: 'Stare',
              option_title: '',
              feature: {
                id: 593,
                type: 'FEATURE_OPTIONS',
                value: { translated: 'Unknown', value: 999999999 },
              },
            },
          ],
        },
      ],
    };

    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/1',
      canonicalUrl: 'https://999.md/ro/1',
      imageBaseUrl: 'https://example.com',
    });

    expect(parsed.condition).toBeUndefined();
    expect(parsed.warnings.some((w) => w === 'STARE_UNKNOWN:999999999')).toBe(true);
  });
});
