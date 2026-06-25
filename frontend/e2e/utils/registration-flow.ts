import { expect, type Page } from '@playwright/test';

import type { CompleteProfilePage } from '../page-objects/complete-profile.page';
import type { SearchHomePage } from '../page-objects/search-home.page';
import type { SignPage } from '../page-objects/sign.page';
import type { VerifyPhonePage } from '../page-objects/verify-phone.page';
import type { RegisterProfileData } from '../test-data/auth';

import { expectPagePath, pathnameWithoutLocalePrefix } from './app-path';
import { expectAuthenticatedSession } from './auth';

export const E2E_REGISTRATION_PASSWORD = 'E2eRegTest1!';
export const E2E_SMS_VERIFICATION_CODE = '000000';

export async function registerIndividualAndReachVerifyPhone(
  signPage: SignPage,
  phone: string,
  password: string = E2E_REGISTRATION_PASSWORD,
): Promise<void> {
  await signPage.openRegisterAndExpectPageView();
  await signPage.registerIndividual(phone, password);
}

export async function registerBusinessAndReachVerifyPhone(
  signPage: SignPage,
  companyName: string,
  phone: string,
  password: string = E2E_REGISTRATION_PASSWORD,
): Promise<void> {
  await signPage.openRegisterAndExpectPageView();
  await signPage.registerBusiness(companyName, phone, password);
}

async function submitRegistrationVerificationFlexible(page: Page): Promise<void> {
  const registerResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  const loginResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 60_000 },
    )
    .catch(() => null);

  await page.getByTestId('verify-phone-submit').click();

  const registerResponse = await registerResponsePromise;
  if (!registerResponse.ok()) {
    const body = await registerResponse.text().catch(() => '');
    throw new Error(`Registration verification failed: HTTP ${registerResponse.status()} ${body}`);
  }

  await loginResponsePromise;

  await expect
    .poll(
      () => {
        const path = pathnameWithoutLocalePrefix(page.url());
        return path === '/' || path.startsWith('/complete-profile');
      },
      { timeout: 60_000 },
    )
    .toBe(true);
}

export async function verifyPhoneAndReachCompleteProfile(
  page: Page,
  verifyPhonePage: VerifyPhonePage,
): Promise<void> {
  await verifyPhonePage.expectPageView();
  await verifyPhonePage.fillCode(E2E_SMS_VERIFICATION_CODE);
  await submitRegistrationVerificationFlexible(page);
  await expectPagePath(page, (path) => path === '/' || path.startsWith('/complete-profile'), {
    timeout: 60_000,
  });
}

export async function completeIndividualProfileAndReachHome(
  completeProfilePage: CompleteProfilePage,
  searchHomePage: SearchHomePage,
  profile: RegisterProfileData,
): Promise<void> {
  await completeProfilePage.expectPageView();
  await completeProfilePage.fillIndividualData(profile.firstName, profile.lastName);
  await completeProfilePage.submitAndExpectHome(searchHomePage);
}

export async function completeBusinessProfileAndReachHome(
  completeProfilePage: CompleteProfilePage,
  searchHomePage: SearchHomePage,
  profile: RegisterProfileData,
): Promise<void> {
  await completeProfilePage.expectPageView();
  await completeProfilePage.fillBusinessData(profile.websiteUrl);
  await completeProfilePage.submitAndExpectHome(searchHomePage);
}

export async function finishRegistrationAndReachHome(
  page: Page,
  verifyPhonePage: VerifyPhonePage,
  completeProfilePage: CompleteProfilePage,
  searchHomePage: SearchHomePage,
  profile: RegisterProfileData,
  userType: 'individual' | 'business',
): Promise<void> {
  await verifyPhoneAndReachCompleteProfile(page, verifyPhonePage);
  const path = pathnameWithoutLocalePrefix(page.url());
  if (path.startsWith('/complete-profile')) {
    if (userType === 'individual') {
      await completeIndividualProfileAndReachHome(completeProfilePage, searchHomePage, profile);
    } else {
      await completeBusinessProfileAndReachHome(completeProfilePage, searchHomePage, profile);
    }
    await expectRegistrationSession(page);
    return;
  }
  await searchHomePage.expectHomeReady();
  await expectRegistrationSession(page);
}

export async function expectRegistrationSession(page: Page): Promise<void> {
  await expectAuthenticatedSession(page);
}
