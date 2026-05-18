import { describe, expect, it } from '@jest/globals';

import type { User } from '@/lib/api';

import {
  isBusinessOnboardingGateExemptRestPath,
  requiresBusinessCompanyOnboarding,
} from './business-onboarding-gate';

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'a@b.com',
    type: 'Business',
    phoneVerified: true,
    companyName: '',
    ...overrides,
  } as User;
}

describe('requiresBusinessCompanyOnboarding', () => {
  it('returns false when user is null', () => {
    expect(requiresBusinessCompanyOnboarding(null)).toBe(false);
  });

  it('returns false for Individual', () => {
    expect(requiresBusinessCompanyOnboarding(baseUser({ type: 'Individual' }))).toBe(false);
  });

  it('returns false when phone is not verified', () => {
    expect(requiresBusinessCompanyOnboarding(baseUser({ phoneVerified: false }))).toBe(false);
  });

  it('returns false when company name is set', () => {
    expect(requiresBusinessCompanyOnboarding(baseUser({ companyName: 'Acme' }))).toBe(false);
  });

  it('returns true for Business with verified phone and empty company name', () => {
    expect(requiresBusinessCompanyOnboarding(baseUser({ companyName: '' }))).toBe(true);
    expect(requiresBusinessCompanyOnboarding(baseUser({ companyName: '   ' }))).toBe(true);
  });
});

describe('isBusinessOnboardingGateExemptRestPath', () => {
  it('allows auth and legal paths', () => {
    expect(isBusinessOnboardingGateExemptRestPath('/sign')).toBe(true);
    expect(isBusinessOnboardingGateExemptRestPath('/verify-phone')).toBe(true);
    expect(isBusinessOnboardingGateExemptRestPath('/terms')).toBe(true);
  });

  it('does not exempt complete-profile', () => {
    expect(isBusinessOnboardingGateExemptRestPath('/complete-profile')).toBe(false);
  });
});
