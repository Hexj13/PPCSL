import { mapColor } from './color-mapper';

describe('mapColor', () => {
  it('maps 999.md Culoarea labels (Romanian)', () => {
    expect(mapColor('Altă').value).toBe('other');
    expect(mapColor('Bronz').value).toBe('bronze');
    expect(mapColor('Burgundia').value).toBe('burgundy');
    expect(mapColor('Crom').value).toBe('silver');
    expect(mapColor('Fildeș').value).toBe('cream');
    expect(mapColor('Ivory').value).toBe('cream');
    expect(mapColor('Satin').value).toBe('metallic_silver');
    expect(mapColor('Șampanie').value).toBe('champagne');
  });

  it('does not warn when color maps to other explicitly', () => {
    const r = mapColor('Altă');
    expect(r.value).toBe('other');
    expect(r.warning).toBeUndefined();
  });
});
