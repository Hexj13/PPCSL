import { describe, expect, it } from '@jest/globals';

import { isAdminPathname, isAuthRequiredPathname } from './header-flow-paths';

describe('isAuthRequiredPathname', () => {
  it('returns true for profile and favorites', () => {
    expect(isAuthRequiredPathname('/ru/profile')).toBe(true);
    expect(isAuthRequiredPathname('/favorites')).toBe(true);
  });

  it('returns true for my-listings, listings new, admin, and listing edit', () => {
    expect(isAuthRequiredPathname('/ru/my-listings')).toBe(true);
    expect(isAuthRequiredPathname('/listings/new')).toBe(true);
    expect(isAuthRequiredPathname('/admin')).toBe(true);
    expect(isAuthRequiredPathname('/ru/listings/abc-123/edit')).toBe(true);
  });

  it('returns false for public pages', () => {
    expect(isAuthRequiredPathname('/')).toBe(false);
    expect(isAuthRequiredPathname('/ru')).toBe(false);
    expect(isAuthRequiredPathname('/ru/listings')).toBe(false);
    expect(isAuthRequiredPathname('/ru/listings/some-id')).toBe(false);
    expect(isAuthRequiredPathname('/ru/compare')).toBe(false);
    expect(isAuthRequiredPathname('/sign')).toBe(false);
  });
});

describe('isAdminPathname', () => {
  it('returns true for admin routes with and without a locale prefix', () => {
    expect(isAdminPathname('/admin')).toBe(true);
    expect(isAdminPathname('/ru/admin')).toBe(true);
    expect(isAdminPathname('/admin/brands')).toBe(true);
  });

  it('returns false for public and auth routes', () => {
    expect(isAdminPathname('/')).toBe(false);
    expect(isAdminPathname('/listings')).toBe(false);
    expect(isAdminPathname('/sign')).toBe(false);
  });
});
