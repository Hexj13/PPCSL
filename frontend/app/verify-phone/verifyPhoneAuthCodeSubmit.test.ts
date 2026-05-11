/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/api', () => ({
  authApi: {
    verifyPhone: jest.fn(async () => undefined),
    me: jest.fn(async () => ({ data: { id: '1', phoneVerified: true } })),
  },
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn(async (u: unknown) => u),
}));

jest.mock('@/lib/i18n', () => ({
  getClientLocale: () => 'ru',
}));

import { submitVerifyPhoneWithAuthCode } from './verifyPhoneAuthCodeSubmit';

describe('submitVerifyPhoneWithAuthCode', () => {
  const setAuth = jest.fn();
  const setError = jest.fn();
  const setCode = jest.fn();
  const setIsSubmitting = jest.fn();
  const setIsVerificationBlocked = jest.fn();
  const setVerificationAttempts = jest.fn();
  const inputRefs = { current: [] as (HTMLInputElement | null)[] };
  const t = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
    let href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        set href(next: string) {
          href = next;
        },
        get href() {
          return href;
        },
      },
    });
  });

  it('redirects to business onboarding after SMS when Google register flow selected Business', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: '/listings',
      source: 'google_register',
      selectedType: 'Business',
      setAuth,
      setError,
      setCode,
      setIsSubmitting,
      setIsVerificationBlocked,
      setVerificationAttempts,
      verificationAttempts: 0,
      inputRefs,
      t,
      toastError: jest.fn(),
    });

    expect(window.location.href).toContain('/ru/complete-profile?');
    expect(window.location.href).toContain('mode=business_onboarding');
    expect(window.location.href).toContain('returnUrl=%2Flistings');
  });

  it('redirects to business onboarding when Business is selected without google_register source', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: null,
      source: null,
      selectedType: 'Business',
      setAuth,
      setError,
      setCode,
      setIsSubmitting,
      setIsVerificationBlocked,
      setVerificationAttempts,
      verificationAttempts: 0,
      inputRefs,
      t,
      toastError: jest.fn(),
    });

    expect(window.location.href).toContain('mode=business_onboarding');
    expect(window.location.href).not.toContain('source=google_register');
  });

  it('redirects to returnUrl after SMS for Google register Individual', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: '/favorites',
      source: 'google_register',
      selectedType: 'Individual',
      setAuth,
      setError,
      setCode,
      setIsSubmitting,
      setIsVerificationBlocked,
      setVerificationAttempts,
      verificationAttempts: 0,
      inputRefs,
      t,
      toastError: jest.fn(),
    });

    expect(window.location.href).toBe('/ru/favorites');
  });
});
