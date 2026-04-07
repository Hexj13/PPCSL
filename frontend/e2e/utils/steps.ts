import { test } from '@playwright/test';

export type E2EStep = {
  name: string;
  action: () => Promise<void>;
};

export async function runSteps(steps: E2EStep[]): Promise<void> {
  for (const step of steps) {
    await test.step(step.name, step.action);
  }
}
