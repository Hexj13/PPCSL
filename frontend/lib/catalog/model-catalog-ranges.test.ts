import { brandRangeSlug, isModelCatalogEnabled, isModelCatalogRange } from './model-catalog-ranges';

describe('model-catalog-ranges', () => {
  const originalFlag = process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG = originalFlag;
    }
  });

  it('enables catalog only when env is exactly true', () => {
    delete process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG;
    expect(isModelCatalogEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG = 'false';
    expect(isModelCatalogEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG = 'true';
    expect(isModelCatalogEnabled()).toBe(true);
  });

  it('validates known range slugs', () => {
    expect(isModelCatalogRange('a-b')).toBe(true);
    expect(isModelCatalogRange('q-s')).toBe(true);
    expect(isModelCatalogRange('a-c')).toBe(false);
  });

  it('maps brands by createSlug first letter', () => {
    expect(brandRangeSlug('Škoda')).toBe('q-s');
    expect(brandRangeSlug('BMW')).toBe('a-b');
    expect(brandRangeSlug('Toyota')).toBe('t-v');
    expect(brandRangeSlug('9ff')).toBe('a-b');
  });
});
