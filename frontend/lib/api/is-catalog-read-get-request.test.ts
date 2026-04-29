import { isCatalogReadGetNoResponse } from './is-catalog-read-get-request';

describe('isCatalogReadGetNoResponse', () => {
  it('returns true for GET catalog paths without response', () => {
    expect(
      isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/brands?vehicleType=car' }),
    ).toBe(true);
    expect(isCatalogReadGetNoResponse({}, { method: 'get', url: '/api/cities' })).toBe(true);
    expect(isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/tire-brands' })).toBe(true);
    expect(
      isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/tire-brands/x/models' }),
    ).toBe(true);
  });

  it('returns false when response exists', () => {
    expect(
      isCatalogReadGetNoResponse(
        { response: { status: 500 } },
        { method: 'GET', url: '/api/cities' },
      ),
    ).toBe(false);
  });

  it('returns false for non-GET or non-catalog paths', () => {
    expect(isCatalogReadGetNoResponse({}, { method: 'POST', url: '/api/cities' })).toBe(false);
    expect(isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/listings' })).toBe(false);
    expect(isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/brands-extra' })).toBe(false);
    expect(isCatalogReadGetNoResponse({}, { method: 'GET', url: '/api/tire-brands-extra' })).toBe(
      false,
    );
  });
});
