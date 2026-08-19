import {
  buildOptimizedPersistentFileName,
  getOptimizedPersistentPath,
  isPersistableDeliveryVariant,
  normalizeOriginalUploadPath,
} from './optimized-delivery-cache.utils';

describe('optimized-delivery-cache.utils', () => {
  it('builds persistent optimized file names', () => {
    expect(buildOptimizedPersistentFileName('/uploads/abc.webp', 75, 640)).toBe('abc_640_75.webp');
    expect(getOptimizedPersistentPath('/uploads/abc.webp', 75, 1080)).toBe(
      '/uploads/optimized/abc_1080_75.webp',
    );
  });

  it('accepts persistable delivery variants used for card warm-up', () => {
    expect(isPersistableDeliveryVariant(75, 640)).toBe(true);
    expect(isPersistableDeliveryVariant(75, 1200)).toBe(true);
    expect(isPersistableDeliveryVariant(74, 640)).toBe(false);
    expect(isPersistableDeliveryVariant(75, 999)).toBe(false);
  });

  it('normalizes original upload paths and rejects derived paths', () => {
    expect(normalizeOriginalUploadPath('https://cdn.example.test/uploads/foo.webp')).toBe(
      '/uploads/foo.webp',
    );
    expect(normalizeOriginalUploadPath('/uploads/optimized/foo_640_75.webp')).toBeNull();
    expect(normalizeOriginalUploadPath('/uploads/thumb/foo.webp')).toBeNull();
  });
});
