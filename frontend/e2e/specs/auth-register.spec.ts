import type { APIRequestContext, Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { buildUniqueMdPhone } from '../fixtures/env';
import type { CompleteProfilePage } from '../page-objects/complete-profile.page';
import type { SearchHomePage } from '../page-objects/search-home.page';
import type { SignPage } from '../page-objects/sign.page';
import type { VerifyPhonePage } from '../page-objects/verify-phone.page';
import { createRegisterProfileData, type RegisterUserType } from '../test-data/auth';
import { useClearedBrowserState } from '../utils/spec-hooks';
import { runSteps, type E2EStep } from '../utils/steps';

const VALID_PASSWORD = 'StrongPass1!';
const LOCAL_SMS_CODE = '000000';
const API_BASE_URL = process.env.API_URL ?? 'http://localhost:4000';
const AUTH_CHECK_PHONE_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/auth/check-phone`;

async function buildAvailableMdPhone(request: APIRequestContext): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidatePhone = buildUniqueMdPhone();
    const response = await request.post(AUTH_CHECK_PHONE_URL, {
      data: { phone: candidatePhone },
    });

    if (response.ok()) {
      const payload = (await response.json()) as { available?: boolean };
      if (payload.available !== false) {
        return candidatePhone;
      }
      continue;
    }

    if (response.status() === 400) {
      continue;
    }

    throw new Error(`Phone availability check failed with status ${response.status()}`);
  }

  throw new Error('Unable to allocate an available phone number for e2e registration');
}

async function registerVerifyAndCompleteProfile(
  page: Page,
  request: APIRequestContext,
  userType: RegisterUserType,
  signPage: SignPage,
  verifyPhonePage: VerifyPhonePage,
  completeProfilePage: CompleteProfilePage,
  searchHomePage: SearchHomePage,
): Promise<void> {
  const phone = await buildAvailableMdPhone(request);
  const registerProfileData = createRegisterProfileData();
  const steps: E2EStep[] = [
    {
      name: 'Open register tab and validate page view',
      action: async () => {
        await signPage.openRegisterAndExpectPageView();
      },
    },
    {
      name:
        userType === 'Individual'
          ? 'Fill individual registration form and submit'
          : 'Fill business registration form and submit',
      action: async () => {
        if (userType === 'Individual') {
          await signPage.registerIndividual(phone, VALID_PASSWORD);
          return;
        }
        await signPage.registerBusiness(registerProfileData.companyName, phone, VALID_PASSWORD);
      },
    },
    {
      name: 'Verify redirect to verify-phone page',
      action: async () => {
        await expect(page).toHaveURL(/\/verify-phone\?phone=/, { timeout: 30_000 });
      },
    },
    {
      name: 'Validate verify-phone page view',
      action: async () => {
        await verifyPhonePage.expectPageView();
      },
    },
    {
      name: 'Fill local SMS code and submit verification',
      action: async () => {
        await verifyPhonePage.fillCode(LOCAL_SMS_CODE);
        await verifyPhonePage.submit();
      },
    },
    {
      name: 'Verify redirect to complete-profile page',
      action: async () => {
        await expect(page).toHaveURL(/\/complete-profile(\?|$)/, { timeout: 30_000 });
      },
    },
    {
      name: 'Validate complete-profile page view',
      action: async () => {
        await completeProfilePage.expectPageView();
      },
    },
    {
      name:
        userType === 'Individual'
          ? 'Fill required individual profile fields'
          : 'Fill required business profile fields',
      action: async () => {
        if (userType === 'Individual') {
          await completeProfilePage.fillIndividualData(
            registerProfileData.firstName,
            registerProfileData.lastName,
          );
          return;
        }
        await completeProfilePage.fillBusinessData(registerProfileData.websiteUrl);
      },
    },
    {
      name: 'Submit complete-profile form',
      action: async () => {
        await completeProfilePage.submit();
      },
    },
    {
      name: 'Verify redirect to home page',
      action: async () => {
        await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 30_000 });
      },
    },
    {
      name: 'Validate home page view',
      action: async () => {
        await searchHomePage.expectPageView();
      },
    },
  ];

  await runSteps(steps);
}

test.describe('Auth: register @p0', () => {
  useClearedBrowserState(test);

  test('switches to register tab and shows register form', async ({ signPage }) => {
    await test.step('Open register tab and validate page view', async () => {
      await signPage.openRegisterAndExpectPageView();
    });
  });

  test('registers individual user and reaches home after complete-profile', async ({
    page,
    request,
    signPage,
    verifyPhonePage,
    completeProfilePage,
    searchHomePage,
  }) => {
    await registerVerifyAndCompleteProfile(
      page,
      request,
      'Individual',
      signPage,
      verifyPhonePage,
      completeProfilePage,
      searchHomePage,
    );
  });

  test('registers business user and reaches home after complete-profile', async ({
    page,
    request,
    signPage,
    verifyPhonePage,
    completeProfilePage,
    searchHomePage,
  }) => {
    await registerVerifyAndCompleteProfile(
      page,
      request,
      'Business',
      signPage,
      verifyPhonePage,
      completeProfilePage,
      searchHomePage,
    );
  });
});
