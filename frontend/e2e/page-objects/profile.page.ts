import { expect, type Page } from '@playwright/test';

import { ProfilePasswordComponent } from '../components/profile/profile-password.component';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';

export class ProfilePage {
  private readonly testIds = {
    page: 'profile-page',
    editForm: 'profile-edit-form',
    save: 'profile-save',
  } as const;

  readonly password: ProfilePasswordComponent;

  constructor(private readonly page: Page) {
    this.password = new ProfilePasswordComponent(page);
  }

  async open(): Promise<void> {
    await forceDefaultCanonicalLocaleCookies(this.page);
    await this.page.goto('/profile', { waitUntil: 'domcontentloaded' });
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/profile'),
    );
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.editForm)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.save)).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await this.expectPageView();
  }
}
