import { brandRangeSlug, isModelCatalogEnabled, isModelCatalogRange } from './model-catalog-ranges';

describe('model-catalog-ranges (backend)', () => {
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
    process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG = 'true';
    expect(isModelCatalogEnabled()).toBe(true);
  });

  it('maps brands by createSlug first letter', () => {
    expect(brandRangeSlug('Škoda')).toBe('q-s');
    expect(brandRangeSlug('BMW')).toBe('a-b');
    expect(brandRangeSlug('9ff')).toBe('a-b');
    expect(isModelCatalogRange('y-z')).toBe(true);
  });
});
