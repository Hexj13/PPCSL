import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';

export class ProfilePage {
  private readonly testIds = {
    page: 'profile-page',
    editForm: 'profile-edit-form',
    save: 'profile-save',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await forceDefaultCanonicalLocaleCookies(this.page);
    await this.page.goto('/profile', { waitUntil: 'domcontentloaded' });
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url.pathname).startsWith('/profile'),
    );
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.editForm)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.save)).toBeVisible();
  }
}
