import { extractVehiculListingPathId } from './vehicul-listing-path-id';

describe('extractVehiculListingPathId', () => {
  it('returns full path slug lowercased', () => {
    expect(
      extractVehiculListingPathId('https://autooutlet.md/vehicul/050505-Toyota-Corolla/'),
    ).toBe('050505-toyota-corolla');
  });

  it('distinguishes listings that share numeric prefix', () => {
    const a = extractVehiculListingPathId(
      'https://autooutlet.md/vehicul/050505-toyota-corolla-cross-2/',
    );
    const b = extractVehiculListingPathId('https://autooutlet.md/vehicul/050505-denza-z9gt/');
    expect(a).toBe('050505-toyota-corolla-cross-2');
    expect(b).toBe('050505-denza-z9gt');
    expect(a).not.toBe(b);
  });

  it('accepts trailing slash and query', () => {
    expect(extractVehiculListingPathId('https://autooutlet.md/vehicul/301742-x/?ref=1')).toBe(
      '301742-x',
    );
  });

  it('returns null when vehicul segment missing', () => {
    expect(extractVehiculListingPathId('https://autooutlet.md/catalog-auto/')).toBeNull();
  });

  it('handles locale prefix before vehicul (cipauto RU)', () => {
    expect(extractVehiculListingPathId('https://cipauto.md/ru/vehicul/850827-Volvo-XC90/')).toBe(
      '850827-volvo-xc90',
    );
  });
});
