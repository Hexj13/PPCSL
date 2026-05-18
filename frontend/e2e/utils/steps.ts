import type { Page } from '@playwright/test';

import { test } from '../fixtures/base';
import type { E2EStep } from '../types/e2e-step';

import { clearBrowserState } from './session';

export type { E2EStep };

export function prependClearBrowserState(page: Page, steps: E2EStep[]): E2EStep[] {
  return [
    {
      name: 'Clear browser state',
      action: async () => {
        await clearBrowserState(page);
      },
    },
    ...steps,
  ];
}

export async function runSteps(steps: E2EStep[]): Promise<void> {
  for (const step of steps) {
    await test.step(step.name, step.action);
  }
}
