import { describe, expect, it } from '@jest/globals';

import {
  DROPDOWN_PORTAL_VIEWPORT_MARGIN_PX as MARGIN,
  clampDropdownPortalLeft,
} from './dropdown-portal-position';

describe('clampDropdownPortalLeft', () => {
  it('keeps a menu that fits aligned to the trigger left', () => {
    expect(
      clampDropdownPortalLeft({
        triggerLeft: 120,
        triggerRight: 200,
        menuWidth: 80,
        viewportWidth: 800,
      }),
    ).toBe(120);
  });

  it('right-aligns to the trigger when left-align would overflow the viewport', () => {
    expect(
      clampDropdownPortalLeft({
        triggerLeft: 720,
        triggerRight: 790,
        menuWidth: 180,
        viewportWidth: 800,
      }),
    ).toBe(610);
  });

  it('clamps a menu wider than the viewport to the side margin', () => {
    expect(
      clampDropdownPortalLeft({
        triggerLeft: 400,
        triggerRight: 480,
        menuWidth: 1000,
        viewportWidth: 800,
      }),
    ).toBe(MARGIN);
  });
});
