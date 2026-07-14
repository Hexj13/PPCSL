import { expect, type Page } from '@playwright/test';

import { RegisterFormComponent } from '../components/auth/register-form.component';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { t, tb } from '../utils/i18n';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { expectErrorToast } from '../utils/toast';

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
    googleOutsideCard: 'auth-google-outside-card',
    googleBlock: 'auth-google-block',
    googleSkeleton: 'auth-google-skeleton',
    googleDisabledOverlay: 'auth-google-disabled-overlay',
  } as const;

  readonly registerForm: RegisterFormComponent;

  constructor(private readonly page: Page) {
    this.registerForm = new RegisterFormComponent(page);
  }

  private visibleAuthPage() {
    return this.page.getByTestId(this.testIds.page).locator('visible=true').first();
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
      const ready = await this.visibleAuthPage()
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

  async openWithPath(path: string): Promise<void> {
    await this.gotoWithRetry(path);
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
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/sign'),
    );
    const root = this.visibleAuthPage();
    await expect(root).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginTab)).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginPanel)).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginForm)).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginInput)).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginPasswordInput)).toBeVisible();
    await expect(root.getByTestId(this.testIds.loginSubmit)).toBeVisible();
  }

  async expectRegisterPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) => {
      const path = pathnameWithoutLocalePrefix(url);
      return (
        path.startsWith('/sign') &&
        (path.includes('tab=register') || url.search.includes('tab=register'))
      );
    });
    const root = this.visibleAuthPage();
    await expect(root).toBeVisible();
    await expect(root.getByTestId(this.testIds.registerTab)).toBeVisible();
    await expect(root.getByTestId(this.testIds.registerPanel)).toBeVisible();
    await this.registerForm.expectVisible();
  }

  async fillLoginCredentials(login: string, password: string): Promise<void> {
    const root = this.visibleAuthPage();
    await root.getByTestId(this.testIds.loginInput).fill(login);
    await root.getByTestId(this.testIds.loginPasswordInput).fill(password);
  }

  async expectPageView(): Promise<void> {
    const path = pathnameWithoutLocalePrefix(this.page.url());
    const isRegister =
      path.includes('tab=register') ||
      new URL(this.page.url()).searchParams.get('tab') === 'register';
    if (isRegister) {
      await this.expectRegisterPageView();
      return;
    }
    await this.expectLoginPageView();
  }

  async submitLogin(): Promise<void> {
    await this.visibleAuthPage().getByTestId(this.testIds.loginSubmit).click();
  }

  async submitLoginAndExpectSuccess(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await this.submitLoginForm();
    const response = await responsePromise;
    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(`Login failed: HTTP ${response.status()} ${body}`);
    }
    await this.page.waitForURL((url) => !pathnameWithoutLocalePrefix(url).startsWith('/sign'), {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    });
  }

  async submitLoginAndExpectInvalid(messageKey: string): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const loginResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await this.submitLogin();
    const response = await loginResponse;
    expect(response.ok()).toBe(false);
    await expectErrorToast(this.page, tb(messageKey));
    await expect(this.page).toHaveURL(/\/sign/);
    await this.expectLoginPageView();
  }

  async submitLoginExpectingNoNavigation(): Promise<void> {
    await this.submitLogin();
    await expect(this.page).toHaveURL(/\/sign/);
    await this.expectLoginPageView();
    const root = this.visibleAuthPage();
    await expect(root.getByText(t('login.emailOrPhoneRequired'))).toBeVisible();
    await expect(root.getByText(t('login.passwordRequired'))).toBeVisible();
  }

  async submitLoginAndExpectStayOnSignPage(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await this.submitLogin();
    await responsePromise;
    await expect(this.page).toHaveURL(/\/sign/);
    await this.expectLoginPageView();
  }

  async submitLoginForm(): Promise<void> {
    await this.visibleAuthPage()
      .getByTestId(this.testIds.loginForm)
      .evaluate((form) => {
        if (!(form instanceof HTMLFormElement)) {
          throw new Error('Expected login form element');
        }
        form.requestSubmit();
      });
  }

  async registerIndividual(phone: string, password: string): Promise<void> {
    await this.registerForm.submitIndividual(phone, password);
  }

  async registerBusiness(companyName: string, phone: string, password: string): Promise<void> {
    await this.registerForm.submitBusiness(companyName, phone, password);
  }

  async expectGoogleButtonReady(): Promise<void> {
    const root = this.visibleAuthPage();
    await expect(root.getByTestId(this.testIds.googleOutsideCard)).toBeVisible();
    await expect(root.getByTestId(this.testIds.googleSkeleton)).toHaveCount(0);
    await expect(root.getByTestId(this.testIds.googleBlock)).toBeVisible();
    await expect(root.getByTestId(this.testIds.googleDisabledOverlay)).toHaveCount(0);
    await expect(root.getByTestId(this.testIds.googleBlock).locator('iframe')).toBeAttached({
      timeout: 15_000,
    });
  }

  async expectGoogleButtonStillClickable(): Promise<void> {
    await this.expectGoogleButtonReady();
    const googleBlock = this.visibleAuthPage().getByTestId(this.testIds.googleBlock);
    await expect
      .poll(
        async () => {
          const clickable = await googleBlock.evaluate((block) => {
            const iframe = block.querySelector('iframe');
            const iframeRect = iframe?.getBoundingClientRect();
            const button = block.querySelector('[role="button"]');
            const buttonRect = button?.getBoundingClientRect();
            const target =
              iframeRect && iframeRect.width > 0 && iframeRect.height > 0
                ? iframe
                : buttonRect && buttonRect.width > 0 && buttonRect.height > 0
                  ? button
                  : null;
            if (!target) {
              return null;
            }
            const rect = target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const hit = document.elementFromPoint(centerX, centerY);
            return {
              width: rect.width,
              height: rect.height,
              hitTestId: hit instanceof HTMLElement ? (hit.dataset.testid ?? null) : null,
            };
          });
          if (
            !clickable ||
            clickable.width <= 0 ||
            clickable.height <= 0 ||
            clickable.hitTestId === this.testIds.googleSkeleton ||
            clickable.hitTestId === this.testIds.googleDisabledOverlay
          ) {
            return null;
          }
          return clickable;
        },
        { timeout: 15_000 },
      )
      .not.toBeNull();
  }
}
