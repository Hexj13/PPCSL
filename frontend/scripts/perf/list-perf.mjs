#!/usr/bin/env node
/* eslint-env node */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const outputDir = path.resolve(__dirname, '../../.perf-audit');
const outputFile = path.join(outputDir, 'list-perf.json');

const VIEWPORTS = [
  { name: 'mobile', device: devices['Pixel 7'] },
  { name: 'desktop', device: devices['Desktop Chrome'] },
];

async function countDomNodes(page) {
  return page.evaluate('document.querySelectorAll("*").length');
}

async function countListingCards(page) {
  return page.evaluate(
    `Array.from(document.querySelectorAll('[data-testid^="listing-card-"]')).filter((el) => !(el.getAttribute('data-testid') || '').startsWith('listing-card-link-')).length`,
  );
}

async function measureResizeCommits(page, steps = 5) {
  let layoutShiftCount = 0;

  await page.evaluate(`
    window.__listPerfResizeCount = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift') {
          window.__listPerfResizeCount += 1;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    window.__listPerfResizeObserver = observer;
  `);

  const startWidth = page.viewportSize()?.width ?? 1280;

  for (let index = 0; index < steps; index += 1) {
    const nextWidth = startWidth - (index + 1) * 24;
    await page.setViewportSize({
      width: Math.max(360, nextWidth),
      height: page.viewportSize()?.height ?? 800,
    });
    await page.waitForTimeout(80);
  }

  layoutShiftCount = await page.evaluate(`
    window.__listPerfResizeObserver?.disconnect();
    return window.__listPerfResizeCount ?? 0;
  `);

  return { resizeSteps: steps, layoutShiftCount };
}

async function measureScenario(browser, viewport) {
  const context = await browser.newContext({
    ...viewport.device,
    baseURL,
  });
  const page = await context.newPage();

  await page.goto('/ru', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('listings-results-grid').waitFor({ state: 'visible', timeout: 60_000 });

  const beforeDomNodes = await countDomNodes(page);
  const beforeCards = await countListingCards(page);

  const loadMoreButton = page.getByRole('button', { name: /show more|показать ещё|arată mai mult/i });
  const hasLoadMore = await loadMoreButton.isVisible().catch(() => false);

  let afterDomNodes = beforeDomNodes;
  let afterCards = beforeCards;

  if (hasLoadMore) {
    await loadMoreButton.click();
    await page.waitForTimeout(500);
    afterDomNodes = await countDomNodes(page);
    afterCards = await countListingCards(page);
  }

  const resize = await measureResizeCommits(page);

  await context.close();

  return {
    viewport: viewport.name,
    domNodes: {
      before: beforeDomNodes,
      after: afterDomNodes,
      delta: afterDomNodes - beforeDomNodes,
    },
    listingCards: {
      before: beforeCards,
      after: afterCards,
      delta: afterCards - beforeCards,
    },
    loadMoreClicked: hasLoadMore,
    resize,
    measuredAt: new Date().toISOString(),
    baseURL,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      results.push(await measureScenario(browser, viewport));
    }
  } finally {
    await browser.close();
  }

  const payload = {
    kind: 'listing-grid-perf',
    results,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputFile}`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
