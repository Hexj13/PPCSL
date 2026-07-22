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

jest.mock('./afterRegistration', () => ({
  completeRegistrationAndGoToProfile: jest.fn(async () => undefined),
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
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to business onboarding after SMS when selected type is Business', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: '/listings',
      source: 'google_register',
      selectedType: 'Business',
      navigate,
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

    expect(navigate).toHaveBeenCalledWith(
      '/complete-profile?mode=business_onboarding&returnUrl=%2Flistings',
    );
    expect(setAuth).toHaveBeenCalled();
  });

  it('navigates to business onboarding when Business is selected without google_register source', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: null,
      source: null,
      selectedType: 'Business',
      navigate,
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

    expect(navigate).toHaveBeenCalledWith('/complete-profile?mode=business_onboarding');
  });

  it('navigates to returnUrl after SMS for Individual OAuth signup', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: '/favorites',
      source: 'google_register',
      selectedType: 'Individual',
      navigate,
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

    expect(navigate).toHaveBeenCalledWith('/complete-profile?returnUrl=%2Ffavorites');
  });

  it('navigates to complete-profile after SMS for Individual without returnUrl', async () => {
    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: null,
      source: 'telegram_register',
      selectedType: 'Individual',
      navigate,
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

    expect(navigate).toHaveBeenCalledWith('/complete-profile');
  });

  it('does not navigate when SMS verification is blocked by max attempts', async () => {
    const { authApi } = await import('@/lib/api');

    jest.mocked(authApi.verifyPhone).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { errorKey: 'errors.maxSmsCodeAttempts' },
      },
    });

    await submitVerifyPhoneWithAuthCode({
      code: '123456',
      mode: 'complete-profile',
      returnUrl: '/favorites',
      source: 'google_register',
      selectedType: 'Individual',
      navigate,
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

    expect(navigate).not.toHaveBeenCalled();
    expect(setIsVerificationBlocked).toHaveBeenCalledWith(true);
  });
});
