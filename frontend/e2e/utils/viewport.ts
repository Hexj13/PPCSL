import type { Page } from '@playwright/test';

import { E2E_MOBILE_MAX_WIDTH_PX } from '../constants/viewport';

export function isMobileProjectName(projectName: string | undefined): boolean {
  return projectName?.startsWith('mobile') ?? false;
}

export async function pageUsesMobileLayout(page: Page): Promise<boolean> {
  const viewport = page.viewportSize();
  if (!viewport) {
    return false;
  }
  return viewport.width <= E2E_MOBILE_MAX_WIDTH_PX;
}
