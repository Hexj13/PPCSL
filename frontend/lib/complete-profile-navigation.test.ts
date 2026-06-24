import { describe, expect, it } from '@jest/globals';

import {
  buildBusinessOnboardingHref,
  buildCompleteProfileHref,
  buildStandardCompleteProfileHref,
} from './complete-profile-navigation';

describe('complete-profile-navigation', () => {
  it('builds standard complete-profile path without returnUrl', () => {
    expect(buildStandardCompleteProfileHref()).toBe('/complete-profile');
  });

  it('builds standard complete-profile path with safe returnUrl', () => {
    expect(buildStandardCompleteProfileHref('/favorites')).toBe(
      '/complete-profile?returnUrl=%2Ffavorites',
    );
  });

  it('ignores unsafe returnUrl', () => {
    expect(buildStandardCompleteProfileHref('https://evil.test')).toBe('/complete-profile');
  });

  it('builds business onboarding path', () => {
    expect(buildBusinessOnboardingHref('/listings')).toBe(
      '/complete-profile?mode=business_onboarding&returnUrl=%2Flistings',
    );
  });

  it('builds phone_required path with extra params', () => {
    expect(
      buildCompleteProfileHref({
        mode: 'phone_required',
        returnUrl: '/favorites',
        extraParams: { source: 'google_register', selectedType: 'Individual' },
      }),
    ).toBe(
      '/complete-profile?mode=phone_required&source=google_register&selectedType=Individual&returnUrl=%2Ffavorites',
    );
  });
});
