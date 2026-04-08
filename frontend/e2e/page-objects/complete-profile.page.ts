import { expect, type Page } from '@playwright/test';

import { CompleteProfileFormComponent } from '../components/profile/complete-profile-form.component';

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
}
