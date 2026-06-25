import { expect, type Page } from '@playwright/test';

import { CompleteProfileFormComponent } from '../components/profile/complete-profile-form.component';
import { expectPagePath } from '../utils/app-path';

import type { SearchHomePage } from './search-home.page';

export class CompleteProfilePage {
  private readonly testIds = {
    page: 'complete-profile-page',
    form: 'complete-profile-form',
    skipButton: 'complete-profile-skip',
    saveButton: 'complete-profile-save',
  } as const;

  readonly form: CompleteProfileFormComponent;

  constructor(private readonly page: Page) {
    this.form = new CompleteProfileFormComponent(page);
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(this.page, (path) => path.startsWith('/complete-profile'));
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.form)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.skipButton)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.saveButton)).toBeVisible();
  }

  async fillIndividualData(firstName: string, lastName: string): Promise<void> {
    await this.form.fillIndividualData(firstName, lastName);
  }

  async fillBusinessData(companyWebsiteUrl: string): Promise<void> {
    await this.form.fillBusinessData(companyWebsiteUrl);
  }

  async submit(): Promise<void> {
    await this.form.submit();
  }

  async submitAndExpectHome(searchHomePage: SearchHomePage): Promise<void> {
    const profileResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/profile') &&
        response.request().method() === 'PATCH' &&
        response.ok(),
      { timeout: 60_000 },
    );
    await this.submit();
    await profileResponse;
    await expectPagePath(this.page, (path) => path === '/', { timeout: 60_000 });
    await searchHomePage.expectHomeReady();
  }
}
