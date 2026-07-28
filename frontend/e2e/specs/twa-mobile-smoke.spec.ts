import { test } from '../fixtures/base';
import { TwaPage } from '../page-objects/twa.page';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('TWA mobile smoke @p0', () => {
  test('home exposes light color scheme and manifest link', async ({
    page,
    searchHomePage,
    twaPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home and expect search shell with TWA meta',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await twaPage.expectHomeTwaShell();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('digital asset links endpoint returns JSON when configured', async ({ request }) => {
    await TwaPage.expectAssetLinksJson(request);
  });
});
