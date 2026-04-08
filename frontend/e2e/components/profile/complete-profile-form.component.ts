import { type Page } from '@playwright/test';

export class CompleteProfileFormComponent {
  private readonly testIds = {
    firstNameInput: 'complete-profile-first-name-input',
    lastNameInput: 'complete-profile-last-name-input',
    companyWebsiteInput: 'complete-profile-company-website-input',
    saveButton: 'complete-profile-save',
  } as const;

  constructor(private readonly page: Page) {}

  async fillIndividualData(firstName: string, lastName: string): Promise<void> {
    await this.page.getByTestId(this.testIds.firstNameInput).fill(firstName);
    await this.page.getByTestId(this.testIds.lastNameInput).fill(lastName);
  }

  async fillBusinessData(companyWebsiteUrl: string): Promise<void> {
    await this.page.getByTestId(this.testIds.companyWebsiteInput).fill(companyWebsiteUrl);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId(this.testIds.saveButton).click();
  }
}
