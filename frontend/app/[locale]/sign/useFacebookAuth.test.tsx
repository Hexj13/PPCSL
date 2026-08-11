/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

const replace = jest.fn();
const setAuth = jest.fn();
const toastError = jest.fn();
const facebookSignIn = jest.fn();
const me = jest.fn();
const analyticsLogin = jest.fn();
const analyticsSignUp = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({ replace }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof setAuth }) => unknown) => selector({ setAuth }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    login: (...args: unknown[]) => analyticsLogin(...args),
    signUp: (...args: unknown[]) => analyticsSignUp(...args),
  },
}));

jest.mock('@/lib/auth-submit-loader', () => ({
  waitForAuthSubmitLoaderMinDisplay: jest.fn(async () => {}),
}));

jest.mock('@/app/[locale]/sign/finishOAuthSession', () => ({
  finishOAuthSession: jest.fn(async () => {}),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    facebookSignIn: (...args: unknown[]) => facebookSignIn(...args),
    me: (...args: unknown[]) => me(...args),
  },
}));

import { finishOAuthSession } from '@/app/[locale]/sign/finishOAuthSession';
import {
  resetFacebookInitStateForTests,
  useFacebookAuth,
} from '@/app/[locale]/sign/useFacebookAuth';

describe('useFacebookAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFacebookInitStateForTests();
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID = 'fb-app-id';
    window.FB = {
      init: jest.fn(),
      login: jest.fn(
        (cb: (r: { status?: string; authResponse?: { accessToken?: string } }) => void) => {
          cb({ status: 'connected', authResponse: { accessToken: 'fb-token' } });
        },
      ),
    };
  });

  it('signs in with Facebook access token and finishes OAuth session for new users', async () => {
    facebookSignIn.mockResolvedValue({
      data: { isNewUser: true, requiresPhoneVerification: true, user: { id: 'u1' } },
    });
    me.mockResolvedValue({ data: { id: 'u1', type: 'Individual', phoneVerified: false } });

    const { result } = renderHook(() =>
      useFacebookAuth({
        tab: 'register',
        preferredNewUserType: 'Business',
        facebookScriptLoaded: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.libraryStatus).toBe('ready');
    });

    await act(async () => {
      result.current.signInWithFacebook();
    });

    await waitFor(() => {
      expect(facebookSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'fb-token',
          termsAccepted: true,
          type: 'Business',
        }),
        expect.any(Object),
      );
      expect(analyticsSignUp).toHaveBeenCalledWith('facebook');
      expect(finishOAuthSession).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneRequiredSource: 'facebook_register',
          isNewUser: true,
          requiresPhoneVerification: true,
        }),
      );
    });
  });

  it('recovers when the Facebook SDK throws while opening the login dialog', async () => {
    window.FB = {
      init: jest.fn(),
      login: jest.fn(() => {
        throw new Error('popup failed');
      }),
    };

    const { result } = renderHook(() =>
      useFacebookAuth({
        tab: 'login',
        facebookScriptLoaded: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.libraryStatus).toBe('ready');
    });

    act(() => {
      result.current.signInWithFacebook();
    });

    expect(result.current.isFacebookBusy).toBe(false);
    expect(toastError).toHaveBeenCalledWith('errors.facebookSignInFailed');
  });
});
