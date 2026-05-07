import robots from './robots';

describe('robots', () => {
  it('disallows private paths and their /ru mirrors', () => {
    const r = robots();
    const disallow = r.rules[0]?.disallow;
    expect(Array.isArray(disallow)).toBe(true);
    const list = disallow as string[];
    expect(list).toContain('/profile/');
    expect(list).toContain('/ru/profile/');
    expect(list).toContain('/favorites');
    expect(list).toContain('/ru/favorites');
    expect(list).toContain('/compare');
    expect(list).toContain('/ru/compare');
    expect(list).toContain('/my-listings');
    expect(list).toContain('/ru/my-listings');
    expect(list).toContain('/api/');
    expect(list).toContain('/admin/');
  });
});
