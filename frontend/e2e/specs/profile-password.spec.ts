import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { test } from '../fixtures/base';
import { provisionGoogleBusinessUser } from '../utils/api/provision-google-user';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

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
          await profilePage.password.expectChangePasswordView();
        },
      },
      {
        name: 'Log out from user menu',
        action: async () => {
          await headerNav.openUserMenuForLogout();
          await headerNav.logout();
          await page.waitForURL((url) => pathnameWithoutLocalePrefix(url) === '/', {
            timeout: 30_000,
            waitUntil: 'domcontentloaded',
          });
        },
      },
      {
        name: 'Log in with phone and new password',
        action: async () => {
          await loginByUi(page, { login: phone, password: NEW_PASSWORD });
        },
      },
      {
        name: 'Open profile and validate change-password view',
        action: async () => {
          await profilePage.open();
          await profilePage.expectLoaded();
          await profilePage.password.scrollIntoView();
          await profilePage.password.expectChangePasswordView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
