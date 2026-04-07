import type { test as PlaywrightTest } from '@playwright/test';

import { clearBrowserState } from './session';

type TestType = Pick<typeof PlaywrightTest, 'beforeEach'>;

export function useClearedBrowserState(test: TestType): void {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });
}
