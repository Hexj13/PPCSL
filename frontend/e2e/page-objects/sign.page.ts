import { expect, type Page } from '@playwright/test';

import { RegisterFormComponent } from '../components/auth/register-form.component';

export class SignPage {
  private readonly testIds = {
    page: 'auth-page',
    loginTab: 'auth-tab-login',
    registerTab: 'auth-tab-register',
    loginPanel: 'auth-panel-login',
    registerPanel: 'auth-panel-register',
    loginForm: 'auth-login-form',
    loginInput: 'auth-login-input',
    loginPasswordInput: 'auth-login-password-input',
    loginSubmit: 'auth-login-submit',
  } as const;

  readonly registerForm: RegisterFormComponent;

  constructor(private readonly page: Page) {
    this.registerForm = new RegisterFormComponent(page);
  }

  private async gotoWithRetry(url: string): Promise<void> {
    for (let routeAttempt = 0; routeAttempt < 3; routeAttempt += 1) {
      let lastGotoError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await this.page.goto(url, { waitUntil: 'load' });
          lastGotoError = undefined;
          break;
        } catch (error) {
          lastGotoError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes('net::ERR_ABORTED') || attempt === 1) {
            break;
          }
        }
      }
      if (lastGotoError) {
        if (routeAttempt === 2) {
          throw lastGotoError;
        }
        await this.page.waitForTimeout(400);
        continue;
      }
      const ready = await this.page
        .getByTestId(this.testIds.page)
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (ready) {
        return;
      }
      if (routeAttempt < 2) {
        await this.page.waitForTimeout(500 * (routeAttempt + 1));
      }
    }
  }

  async openLogin(): Promise<void> {
    await this.gotoWithRetry('/sign');
  }

  async openRegister(): Promise<void> {
    await this.gotoWithRetry('/sign?tab=register');
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
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginTab)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginPanel)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginForm)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginPasswordInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.loginSubmit)).toBeVisible();
  }

  async expectRegisterPageView(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.registerTab)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.registerPanel)).toBeVisible();
    await this.registerForm.expectVisible();
  }

  async fillLoginCredentials(login: string, password: string): Promise<void> {
    await this.page.getByTestId(this.testIds.loginInput).fill(login);
    await this.page.getByTestId(this.testIds.loginPasswordInput).fill(password);
  }

  async submitLogin(): Promise<void> {
    await this.page.getByTestId(this.testIds.loginSubmit).click();
  }

  async registerIndividual(phone: string, password: string): Promise<void> {
    await this.registerForm.submitIndividual(phone, password);
  }

  async registerBusiness(companyName: string, phone: string, password: string): Promise<void> {
    await this.registerForm.submitBusiness(companyName, phone, password);
  }
}
