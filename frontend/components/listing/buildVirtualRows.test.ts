import type { Listing } from '@/lib/api';
import { Currency } from '@/lib/constants';

import { buildVirtualRows } from './buildVirtualRows';

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

describe('buildVirtualRows', () => {
  it('groups listings into card rows by column count', () => {
    const listings = Array.from({ length: 5 }, (_, index) => createListing(`listing-${index + 1}`));
    const { rows } = buildVirtualRows(listings, 2, { showPartnerPromoBanner: false });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      kind: 'cards',
      items: [
        { listing: listings[0], index: 0 },
        { listing: listings[1], index: 1 },
      ],
    });
    expect(rows[2]).toEqual({
      kind: 'cards',
      items: [{ listing: listings[4], index: 4 }],
    });
  });

  it('inserts a single breakpoint-aligned banner per column count', () => {
    const listings = Array.from({ length: 12 }, (_, index) =>
      createListing(`listing-${index + 1}`),
    );

    const variantsOf = (result: ReturnType<typeof buildVirtualRows>) =>
      result.rows
        .filter((row) => row.kind === 'banner')
        .map((row) => (row.kind === 'banner' ? row.variant : null));

    expect(variantsOf(buildVirtualRows(listings, 4, { showPartnerPromoBanner: true }))).toEqual([
      'xl',
    ]);
    expect(variantsOf(buildVirtualRows(listings, 3, { showPartnerPromoBanner: true }))).toEqual([
      'lg',
    ]);
    expect(variantsOf(buildVirtualRows(listings, 2, { showPartnerPromoBanner: true }))).toEqual([
      'mobile',
    ]);
  });

  it('never produces partial card rows before the last row when banners are inserted', () => {
    const listings = Array.from({ length: 16 }, (_, index) =>
      createListing(`listing-${index + 1}`),
    );

    for (const columns of [1, 2, 3, 4]) {
      const { rows } = buildVirtualRows(listings, columns, { showPartnerPromoBanner: true });
      const cardRows = rows.filter((row) => row.kind === 'cards');

      cardRows.slice(0, -1).forEach((row) => {
        if (row.kind === 'cards') {
          expect(row.items).toHaveLength(columns);
        }
      });
    }
  });

  it('maps listing ids to their virtual row index', () => {
    const listings = Array.from({ length: 4 }, (_, index) => createListing(`listing-${index + 1}`));
    const { listingRowIndexById } = buildVirtualRows(listings, 2, {
      showPartnerPromoBanner: false,
    });

    expect(listingRowIndexById.get('listing-1')).toBe(0);
    expect(listingRowIndexById.get('listing-2')).toBe(0);
    expect(listingRowIndexById.get('listing-3')).toBe(1);
    expect(listingRowIndexById.get('listing-4')).toBe(1);
  });
});
