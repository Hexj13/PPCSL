import { buildBrandCandidateKeys, findBrandCandidates } from './brand-model-resolver';

describe('buildBrandCandidateKeys', () => {
  it('prefers Mercedes-Benz when 999 uses short Mercedes', () => {
    expect(buildBrandCandidateKeys('Mercedes', 'GLA')).toEqual(['mercedesbenz', 'mercedes']);
  });
});

describe('findBrandCandidates', () => {
  it('resolves Mercedes to Mercedes-Benz brand in Kupito', () => {
    const brands = [
      { name: 'Mercedes-Benz', name_normalized: 'mercedesbenz' as string | null },
      { name: 'Other', name_normalized: 'other' },
    ];
    const found = findBrandCandidates(brands, 'Mercedes', 'GLA');
    expect(found.map((b) => b.name)).toEqual(['Mercedes-Benz']);
  });
});
