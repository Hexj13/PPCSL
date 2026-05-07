import { describe, expect, it } from '@jest/globals';

import type { AdvertRaw } from './advert-types';
import { normalize999mdAdvert } from './pdp-normalizer';

describe('normalize999mdAdvert', () => {
  it('extracts video URL from string feature values', () => {
    const advert: AdvertRaw = {
      id: 'adv1',
      title: 'Car',
      groups: [
        {
          title: 'Media',
          controls: [
            {
              type: 'CONTROL_TYPE_TEXT',
              title: 'Video',
              option_title: '',
              feature: { id: 1, type: 'FEATURE_TEXT', value: 'https://cdn.example.com/car.mp4' },
            },
          ],
        },
      ],
    };
    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/adv1',
      canonicalUrl: 'https://999.md/adv1',
      imageBaseUrl: 'https://img.999.md',
    });
    expect(parsed.videoUrl).toBe('https://cdn.example.com/car.mp4');
  });

  it('extracts description_ro and description_ru from FEATURE_BODY bilingual object', () => {
    const advert: AdvertRaw = {
      id: '104222850',
      title: 'Volvo XC40',
      groups: [
        {
          title: 'Details',
          controls: [
            {
              type: 'CONTROL_TYPE_TEXT',
              title: 'Body',
              option_title: '',
              feature: {
                id: 13,
                type: 'FEATURE_BODY',
                value: { ro: 'Descriere RO', ru: 'Описание RU' },
              },
            },
          ],
        },
      ],
    };
    const parsed = normalize999mdAdvert({
      advert,
      listingUrl: 'https://999.md/ro/104222850',
      canonicalUrl: 'https://999.md/ro/104222850',
      imageBaseUrl: 'https://img.999.md',
    });
    expect(parsed.description_ro).toBe('Descriere RO');
    expect(parsed.description_ru).toBe('Описание RU');
    expect(parsed.description).toBe('Descriere RO');
  });
});
