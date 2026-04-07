import { expect, type Page } from '@playwright/test';

import { CompleteProfileFormComponent } from '../components/profile/complete-profile-form.component';
import { COMPLETE_PROFILE_LOCATORS } from '../constants/locators';

export class CompleteProfilePage {
  readonly form: CompleteProfileFormComponent;

  constructor(private readonly page: Page) {
    this.form = new CompleteProfileFormComponent(page);
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.page)).toBeVisible();
    await expect(this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.form)).toBeVisible();
    await expect(this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.skipButton)).toBeVisible();
    await expect(this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.saveButton)).toBeVisible();
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
