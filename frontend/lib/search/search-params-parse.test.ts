import { encodeBase64Array } from './search-params-encoding';
import { parseSearchParams } from './search-params-parse';

describe('parseSearchParams', () => {
  it('defaults vehicleType to car and page/limit', async () => {
    const parsed = await parseSearchParams(new URLSearchParams());
    expect(parsed.vehicleType).toBe('car');
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.category).toBeUndefined();
  });

  it('parses vehicle filters, booleans, and number bounds', async () => {
    const parsed = await parseSearchParams(
      new URLSearchParams({
        vehicleType: 'truck',
        year_gte: '2010',
        year_lte: '2020',
        price_gte: '1000',
        price_lte: '5000',
        fuels: 'petrol,diesel',
        urgent: 'true',
        is_new: 'false',
        available_in_credit: 'true',
        page: '2',
        limit: '50',
        seller_types: 'Business',
      }),
    );
    expect(parsed.vehicleType).toBe('truck');
    expect(parsed.year_gte).toBe(2010);
    expect(parsed.year_lte).toBe(2020);
    expect(parsed.price_gte).toBe(1000);
    expect(parsed.price_lte).toBe(5000);
    expect(parsed.fuels).toBe('petrol,diesel');
    expect(parsed.urgent).toBe(true);
    expect(parsed.is_new).toBe(false);
    expect(parsed.available_in_credit).toBe(true);
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
    expect(parsed.seller_types).toBe('Business');
  });

  it('clamps page and limit bounds', async () => {
    const parsed = await parseSearchParams(
      new URLSearchParams({
        page: '0',
        limit: '999',
      }),
    );
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(100);
  });

  it('ignores invalid down_payment_amount_gte', async () => {
    const parsed = await parseSearchParams(
      new URLSearchParams({
        down_payment_amount_gte: 'abc',
      }),
    );
    expect(parsed.down_payment_amount_gte).toBeUndefined();
  });

  it('decodes _e encoded array params', async () => {
    const encodedFuels = encodeBase64Array(['petrol', 'diesel']);
    const parsed = await parseSearchParams(
      new URLSearchParams({
        _e: '1',
        fuels: encodedFuels,
      }),
    );
    expect(parsed.fuels).toBe('petrol,diesel');
  });

  it('resolves brand/model slugs via resolvers', async () => {
    const parsed = await parseSearchParams(
      new URLSearchParams({ brand: 'toyota', model: 'yaris' }),
      {
        brandResolver: async (slugs) => (slugs.includes('toyota') ? ['brand-1'] : []),
        modelResolver: async (brandIds, slugs) =>
          brandIds.includes('brand-1') && slugs.includes('yaris') ? ['model-2'] : [],
      },
    );
    expect(parsed.brand_ids).toBe('brand-1');
    expect(parsed.model_ids).toBe('model-2');
  });

  it('uses no-match brand id when resolver returns empty', async () => {
    const parsed = await parseSearchParams(new URLSearchParams({ brand: 'missing' }), {
      brandResolver: async () => [],
    });
    expect(parsed.brand_ids).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('parses tire category and strips vehicle-only fields', async () => {
    const parsed = await parseSearchParams(
      new URLSearchParams({
        category: 'tire',
        tireVehicleType: 'car',
        tire_widths: '205,225',
        tire_studded: 'true',
        fuels: 'petrol',
        vehicleType: 'truck',
      }),
    );
    expect(parsed.category).toBe('tire');
    expect(parsed.tireVehicleType).toBe('car');
    expect(parsed.tire_widths).toBe('205,225');
    expect(parsed.tire_studded).toBe(true);
    expect(parsed.fuels).toBeUndefined();
    expect(parsed.vehicleType).toBeUndefined();
  });

  it('maps seller_types multi and legacy seller_type from record params', async () => {
    const multi = await parseSearchParams({
      seller_types: 'Business,Individual',
    });
    expect(multi.seller_types).toBe('Business,Individual');

    const legacy = await parseSearchParams({
      seller_type: 'Business',
    });
    expect(legacy.seller_types).toBe('Business');
  });

  it('maps legacy singular keys from record params onto legacy field names', async () => {
    const parsed = await parseSearchParams({
      fuel: 'petrol',
      city: 'chisinau',
      brand_id: 'legacy-brand',
    });
    const legacy = parsed as typeof parsed & {
      fuel?: string;
      city?: string;
      brand_id?: string;
    };
    expect(legacy.fuel).toBe('petrol');
    expect(legacy.city).toBe('chisinau');
    expect(legacy.brand_id).toBe('legacy-brand');
  });
});
