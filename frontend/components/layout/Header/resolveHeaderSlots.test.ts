import { describe, expect, it } from '@jest/globals';

import { resolveHeaderSlots } from './resolveHeaderSlots';

describe('resolveHeaderSlots', () => {
  it('shows menu, search, and actions on the public home page', () => {
    const slots = resolveHeaderSlots('/', true, false);
    expect(slots.showMenuSlot).toBe(true);
    expect(slots.showCatalogSearch).toBe(true);
    expect(slots.showActionsSlot).toBe(true);
    expect(slots.showDesktopLanguage).toBe(true);
  });

  it('hides catalog search on sign and admin routes', () => {
    expect(resolveHeaderSlots('/sign', true, false).showCatalogSearch).toBe(false);
    expect(resolveHeaderSlots('/admin', true, false).showCatalogSearch).toBe(false);
    expect(resolveHeaderSlots('/admin', true, false).showMenuSlot).toBe(true);
  });

  it('hides desktop language on an error page', () => {
    expect(resolveHeaderSlots('/', false, true).showDesktopLanguage).toBe(false);
  });
});
