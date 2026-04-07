import { expect, type Page } from '@playwright/test';

import { RegisterFormComponent } from '../components/auth/register-form.component';
import { AUTH_LOCATORS } from '../constants/locators';

export class SignPage {
  readonly registerForm: RegisterFormComponent;

  constructor(private readonly page: Page) {
    this.registerForm = new RegisterFormComponent(page);
  }

  async openLogin(): Promise<void> {
    await this.page.goto('/sign', { waitUntil: 'domcontentloaded' });
  }

  async openRegister(): Promise<void> {
    await this.page.goto('/sign?tab=register', { waitUntil: 'domcontentloaded' });
  }

  async openLoginAndExpectPageView(): Promise<void> {
    await this.openLogin();
    await this.expectLoginPageView();
  }

  async openRegisterAndExpectPageView(): Promise<void> {
    await this.openRegister();
    await this.expectRegisterPageView();
  }

  async expectLoginPageView(): Promise<void> {
    await expect(this.page.getByTestId(AUTH_LOCATORS.page)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginTab)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginPanel)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginForm)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginInput)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginPasswordInput)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.loginSubmit)).toBeVisible();
  }

  async expectRegisterPageView(): Promise<void> {
    await expect(this.page.getByTestId(AUTH_LOCATORS.page)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerTab)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerPanel)).toBeVisible();
    await this.registerForm.expectVisible();
  }

  async fillLoginCredentials(login: string, password: string): Promise<void> {
    await this.page.getByTestId(AUTH_LOCATORS.loginInput).fill(login);
    await this.page.getByTestId(AUTH_LOCATORS.loginPasswordInput).fill(password);
  }

  async submitLogin(): Promise<void> {
    await this.page.getByTestId(AUTH_LOCATORS.loginSubmit).click();
  }

  async registerIndividual(phone: string, password: string): Promise<void> {
    await this.registerForm.submitIndividual(phone, password);
  }

  async registerBusiness(companyName: string, phone: string, password: string): Promise<void> {
    await this.registerForm.submitBusiness(companyName, phone, password);
  }
}
