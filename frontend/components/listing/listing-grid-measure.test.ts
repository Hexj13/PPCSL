/** @jest-environment jsdom */

import type { Listing } from '@/lib/api';
import { Currency } from '@/lib/constants';

import { buildVirtualRows } from './buildVirtualRows';
import {
  measureStaticRowHeights,
  resolveVirtualContainerHeight,
  resolveVirtualRowSize,
} from './listing-grid-measure';

function createListing(id: string): Listing {
  return {
    id,
    title: `Listing ${id}`,
    price: 10000,
    currency: Currency.EUR,
    city: 'Chisinau',
    status: 'Active',
    condition: 'Undamaged',
    registration_type: 'Local',
    horsepower: 150,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_updated_at: '2024-01-01T00:00:00Z',
    images: ['/test-image.jpg'],
    vehicle: {
      id: `vehicle-${id}`,
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2020,
      engine_displ_l: 2,
      fuel: 'Petrol',
      mileage_km: 50000,
      body_type: 'Sedan',
      drive_type: 'FWD',
    },
    views: 1,
  };
}

describe('measureStaticRowHeights', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('measures raw card row heights without gap', () => {
    const listings = [createListing('a'), createListing('b'), createListing('c')];
    const { rows } = buildVirtualRows(listings, 1, { showPartnerPromoBanner: false });

    const grid = document.createElement('div');
    for (const listing of listings) {
      const card = document.createElement('div');
      card.setAttribute('data-testid', `listing-card-${listing.id}`);
      Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 400 });
      grid.appendChild(card);
    }
    document.body.appendChild(grid);

    expect(measureStaticRowHeights(grid, rows)).toEqual([400, 400, 400]);
  });

  it('returns raw content height without gap so the virtualizer owns row spacing', () => {
    expect(resolveVirtualRowSize(0, 3, 400, 500)).toBe(400);
    expect(resolveVirtualRowSize(2, 3, 400, 500)).toBe(400);
    expect(resolveVirtualRowSize(0, 2, undefined, 500)).toBe(500);
    expect(resolveVirtualRowSize(1, 2, 400, 500)).toBe(400);
  });

  it('uses rendered inner height when it exceeds the cached virtual total', () => {
    expect(resolveVirtualContainerHeight(6000, 100, 6200)).toBe(6300);
  });

  it('keeps the virtualizer total when rendered content already fits', () => {
    expect(resolveVirtualContainerHeight(6400, 200, 5000)).toBe(6400);
  });

  it('measures card row height as the tallest card in the row', () => {
    const listings = [
      createListing('a'),
      createListing('b'),
      createListing('c'),
      createListing('d'),
    ];
    const { rows } = buildVirtualRows(listings, 2, { showPartnerPromoBanner: false });

    const grid = document.createElement('div');
    const heightsById: Record<string, number> = {
      a: 400,
      b: 460,
      c: 420,
      d: 430,
    };
    for (const listing of listings) {
      const card = document.createElement('div');
      card.setAttribute('data-testid', `listing-card-${listing.id}`);
      Object.defineProperty(card, 'offsetHeight', {
        configurable: true,
        value: heightsById[listing.id],
      });
      grid.appendChild(card);
    }
    document.body.appendChild(grid);

    expect(measureStaticRowHeights(grid, rows)).toEqual([460, 430]);
  });

  it('returns undefined when card element is missing', () => {
    const listings = [createListing('missing')];
    const { rows } = buildVirtualRows(listings, 1, { showPartnerPromoBanner: false });
    const grid = document.createElement('div');
    document.body.appendChild(grid);

    expect(measureStaticRowHeights(grid, rows)).toEqual([undefined]);
  });

  it('measures banner row height from partner promo wrapper', () => {
    const listings = Array.from({ length: 6 }, (_, index) => createListing(`listing-${index + 1}`));
    const { rows } = buildVirtualRows(listings, 1, { showPartnerPromoBanner: true });

    const grid = document.createElement('div');
    for (const listing of listings) {
      const card = document.createElement('div');
      card.setAttribute('data-testid', `listing-card-${listing.id}`);
      Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 400 });
      grid.appendChild(card);
    }
    const bannerWrap = document.createElement('div');
    bannerWrap.className = 'col-span-full';
    Object.defineProperty(bannerWrap, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height: 300 }) as DOMRect,
    });
    const banner = document.createElement('div');
    banner.setAttribute('data-testid', 'partner-promo-banner');
    bannerWrap.appendChild(banner);
    grid.appendChild(bannerWrap);
    document.body.appendChild(grid);

    const heights = measureStaticRowHeights(grid, rows);
    const bannerRowIndex = rows.findIndex((row) => row.kind === 'banner');
    expect(heights[bannerRowIndex]).toBe(300);
  });
});
