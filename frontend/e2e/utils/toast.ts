import { expect, type Page } from '@playwright/test';

const TOASTER = '#_rht_toaster';

async function isToastVisible(
  page: Page,
  variant: 'success' | 'error' | 'warning',
  message?: string | RegExp,
): Promise<boolean> {
  const marker = `.ppcsl-toast--${variant}`;
  const role = variant === 'error' ? 'alert' : 'status';
  const locators = [
    page.locator(`${TOASTER} ${marker}`),
    page.locator(`${TOASTER} [data-hot-toast]`),
    page.locator(`${TOASTER} [role="${role}"]`),
    page.getByRole(variant === 'error' ? 'alert' : 'status'),
  ];
  for (const locator of locators) {
    const target = message ? locator.filter({ hasText: message }) : locator;
    if (
      await target
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
  }
  if (message) {
    if (
      await page
        .getByText(message)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
}

async function expectToastVisible(
  page: Page,
  variant: 'success' | 'error' | 'warning',
  message?: string | RegExp,
): Promise<void> {
  await expect
    .poll(async () => isToastVisible(page, variant, message), { timeout: 20_000 })
    .toBe(true);
}

export async function expectSuccessToast(page: Page, message?: string | RegExp): Promise<void> {
  await expectToastVisible(page, 'success', message);
}

export async function expectErrorToast(page: Page, message?: string | RegExp): Promise<void> {
  await expectToastVisible(page, 'error', message);
}

export async function expectWarningToast(page: Page, message?: string | RegExp): Promise<void> {
  await expectToastVisible(page, 'warning', message);
}
