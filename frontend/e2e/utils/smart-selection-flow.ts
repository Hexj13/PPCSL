import type { SmartSelectionPage } from '../page-objects/smart-selection.page';

export async function completeSmartSelectionWizard(
  smartSelectionPage: SmartSelectionPage,
): Promise<void> {
  await smartSelectionPage.selectOption('city');
  await smartSelectionPage.clickNext();

  await smartSelectionPage.selectOption('city');
  await smartSelectionPage.clickNext();

  await smartSelectionPage.selectOption('up_to_15000');
  await smartSelectionPage.clickNext();

  await smartSelectionPage.selectOption('medium');
  await smartSelectionPage.selectOption('auto_pick');
  await smartSelectionPage.clickNext();

  await smartSelectionPage.selectOption('prefer_automatic');
  await smartSelectionPage.selectOption('auto_pick');
  await smartSelectionPage.clickNext();

  await smartSelectionPage.selectOption('not_older_than_5');
  await smartSelectionPage.selectOption('up_to_150000');
  await smartSelectionPage.selectOption('reliability');
}
