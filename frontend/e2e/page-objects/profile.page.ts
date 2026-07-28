import { expect, type Page } from '@playwright/test';

import { ProfilePasswordComponent } from '../components/profile/profile-password.component';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';

export class ProfilePage {
  private readonly testIds = {
    page: 'profile-page',
    editForm: 'profile-edit-form',
    save: 'profile-save',
    phoneInput: 'profile-phone-input',
    firstNameInput: 'profileFirstName',
    companyNameInput: 'profileCompanyName',
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
    const form = this.page.getByTestId(this.testIds.editForm);
    await expect(form).toBeVisible();
    await expect(form.locator(`#${this.testIds.phoneInput}`)).toBeVisible();
    const nameField = form.locator(`input[name="${this.testIds.firstNameInput}"]`);
    const companyField = form.locator(`input[name="${this.testIds.companyNameInput}"]`);
    await expect(nameField.or(companyField)).toBeVisible();
    if (await nameField.isVisible()) {
      await expect(form.locator('input[name="profileLastName"]')).toBeVisible();
    }
    await expect(this.page.getByTestId(this.testIds.save)).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await this.expectPageView();
  }
}
