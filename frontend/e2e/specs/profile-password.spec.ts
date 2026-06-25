import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { test } from '../fixtures/base';
import { provisionGoogleBusinessUser } from '../utils/api/provision-google-user';
import { expectAuthenticatedSession, loginByUi } from '../utils/auth';
import { t } from '../utils/i18n';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { expectSuccessToast } from '../utils/toast';

const NEW_PASSWORD = 'E2eGoogle1!';

test.describe('Profile password (Google account)', () => {
  test('allows setting an initial password and switches to change-password UI', async ({
    page,
    profilePage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Provision Google business user without password',
        action: async () => {
          await provisionGoogleBusinessUser(page);
        },
      },
      {
        name: 'Open profile and validate set-password view',
        action: async () => {
          await profilePage.open();
          await profilePage.expectLoaded();
          await profilePage.password.scrollIntoView();
          await profilePage.password.expectSetPasswordView();
          await profilePage.password.expectSaveDisabled();
        },
      },
      {
        name: 'Fill new password and save',
        action: async () => {
          await profilePage.password.fillNewPassword(NEW_PASSWORD);
          await profilePage.password.expectSaveEnabled();
          await profilePage.password.submitPasswordSave();
          await expectSuccessToast(page, t('profile.passwordSetSuccess'));
          await profilePage.expectPageView();
          await profilePage.password.expectChangePasswordView();
          await profilePage.password.expectSaveDisabled();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('allows login with phone and password after initial password is set', async ({
    page,
    profilePage,
    searchHomePage,
  }) => {
    let phone = '';
    const headerNav = new HeaderNavComponent(page);

    const steps: E2EStep[] = [
      {
        name: 'Provision Google business user and set password in profile',
        action: async () => {
          const user = await provisionGoogleBusinessUser(page);
          phone = user.phone;
          await profilePage.open();
          await profilePage.expectLoaded();
          await profilePage.password.scrollIntoView();
          await profilePage.password.expectSetPasswordView();
          await profilePage.password.fillNewPassword(NEW_PASSWORD);
          await profilePage.password.expectSaveEnabled();
          await profilePage.password.submitPasswordSave();
          await expectSuccessToast(page, t('profile.passwordSetSuccess'));
          await profilePage.expectPageView();
          await profilePage.password.expectChangePasswordView();
        },
      },
      {
        name: 'Log out from user menu',
        action: async () => {
          await headerNav.logoutAndExpectSignedOut(searchHomePage);
        },
      },
      {
        name: 'Log in with phone and new password',
        action: async () => {
          await loginByUi(page, { login: phone, password: NEW_PASSWORD });
          await searchHomePage.expectHomeReady();
          await expectAuthenticatedSession(page);
        },
      },
      {
        name: 'Open profile and validate change-password view',
        action: async () => {
          await profilePage.open();
          await profilePage.expectPageView();
          await profilePage.password.scrollIntoView();
          await profilePage.password.expectChangePasswordView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
