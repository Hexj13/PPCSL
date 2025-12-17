import type { Metadata } from 'next';

import { generateMetadata } from '@/app/page';

jest.mock('@/lib/server-api', () => ({
  fetchBrands: jest.fn().mockResolvedValue([]),
  fetchModelsByBrands: jest.fn().mockResolvedValue({}),
  getListings: jest.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 5 },
  }),
}));

describe('app/page generateMetadata (pagination + canonical policy)', () => {
  it('noindexes pages with non-allowlisted params and canonicals to clean URL', async () => {
    const metadata: Metadata = await generateMetadata({
      searchParams: Promise.resolve({ price_gte: '1000', brand: 'toyota', page: '2' }),
    });

    expect(metadata.robots).toEqual(
      expect.objectContaining({
        index: false,
        follow: false,
      })
    );

    expect(metadata.alternates).toEqual(
      expect.objectContaining({
        canonical: expect.stringMatching(/^https?:\/\/[^/]+\/?\?brand=toyota$/),
      })
    );
  });

  it('includes page in canonical only for page>1 (indexable params only)', async () => {
    const metadata: Metadata = await generateMetadata({
      searchParams: Promise.resolve({ brand: 'toyota', page: '2' }),
    });

    expect(metadata.robots).toBeUndefined();

    expect(metadata.alternates).toEqual(
      expect.objectContaining({
        canonical: expect.stringMatching(/^https?:\/\/[^/]+\/?\?brand=toyota&page=2$/),
        prev: expect.stringMatching(/^https?:\/\/[^/]+\/?\?brand=toyota$/),
        next: expect.stringMatching(/^https?:\/\/[^/]+\/?\?brand=toyota&page=3$/),
      })
    );
  });

  it('omits page=1 from canonical', async () => {
    const metadata: Metadata = await generateMetadata({
      searchParams: Promise.resolve({ brand: 'toyota', page: '1' }),
    });

    expect(metadata.alternates).toEqual(
      expect.objectContaining({
        canonical: expect.stringMatching(/^https?:\/\/[^/]+\/?\?brand=toyota$/),
      })
    );

    const alternates = metadata.alternates as Record<string, unknown>;
    expect(alternates).not.toHaveProperty('prev');
  });
});
