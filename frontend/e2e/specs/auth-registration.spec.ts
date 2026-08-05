import { test } from '../fixtures/base';
import { createRegisterProfileData } from '../test-data/auth';
import { buildAvailablePlatformPhone } from '../utils/api/check-phone';
import {
  E2E_REGISTRATION_PASSWORD,
  finishRegistrationAndReachHome,
  registerBusinessAndReachVerifyPhone,
  registerIndividualAndReachVerifyPhone,
} from '../utils/registration-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Auth: registration @p0', () => {
  test('individual registration reaches home through verify-phone and complete-profile', async ({
    page,
    request,
    signPage,
    verifyPhonePage,
    completeProfilePage,
    searchHomePage,
  }) => {
    test.setTimeout(180_000);
    const phone = await buildAvailablePlatformPhone(request);
    const profile = createRegisterProfileData();

    const steps: E2EStep[] = [
      {
        name: 'Register individual and reach verify-phone',
        action: async () => {
          await registerIndividualAndReachVerifyPhone(signPage, phone, E2E_REGISTRATION_PASSWORD);
        },
      },
      {
        name: 'Verify phone, complete profile when required, and reach home',
        action: async () => {
          await finishRegistrationAndReachHome(
            page,
            verifyPhonePage,
            completeProfilePage,
            searchHomePage,
            profile,
            'individual',
          );
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('business registration reaches home through verify-phone and complete-profile', async ({
    page,
    request,
    signPage,
    verifyPhonePage,
    completeProfilePage,
    searchHomePage,
  }) => {
    test.setTimeout(180_000);
    const phone = await buildAvailablePlatformPhone(request);
    const profile = createRegisterProfileData();

    const steps: E2EStep[] = [
      {
        name: 'Register business and reach verify-phone',
        action: async () => {
          await registerBusinessAndReachVerifyPhone(
            signPage,
            profile.companyName,
            phone,
            E2E_REGISTRATION_PASSWORD,
          );
        },
      },
      {
        name: 'Verify phone, complete profile when required, and reach home',
        action: async () => {
          await finishRegistrationAndReachHome(
            page,
            verifyPhonePage,
            completeProfilePage,
            searchHomePage,
            profile,
            'business',
          );
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
