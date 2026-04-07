import { type Page } from '@playwright/test';

import { COMPLETE_PROFILE_LOCATORS } from '../../constants/locators';

export class CompleteProfileFormComponent {
  constructor(private readonly page: Page) {}

  async fillIndividualData(firstName: string, lastName: string): Promise<void> {
    await this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.firstNameInput).fill(firstName);
    await this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.lastNameInput).fill(lastName);
  }

  async fillBusinessData(companyWebsiteUrl: string): Promise<void> {
    await this.page
      .getByTestId(COMPLETE_PROFILE_LOCATORS.companyWebsiteInput)
      .fill(companyWebsiteUrl);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId(COMPLETE_PROFILE_LOCATORS.saveButton).click();
  }
}
