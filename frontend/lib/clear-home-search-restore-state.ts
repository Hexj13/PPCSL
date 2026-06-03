import { sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { clearFiltersFromStorage } from '@/lib/search';

const GRID_STATE_KEY = 'kupito_grid_state';
const GRID_RESTORE_STATE_KEY = 'kupito_grid_restore_state';

export function clearHomeSearchRestoreState(): void {
  if (typeof window === 'undefined') return;
  clearFiltersFromStorage();
  sessionStorageRemoveItem('homeScrollPosition');
  sessionStorageRemoveItem('homeScrollTimestamp');
  sessionStorageRemoveItem(GRID_STATE_KEY);
  sessionStorageRemoveItem(GRID_RESTORE_STATE_KEY);
  sessionStorageRemoveItem('scrollPreserved');
  sessionStorageRemoveItem('scrollToResultsAfterLoad');
  sessionStorageRemoveItem('homeReloadScrollY');
  sessionStorageRemoveItem('homeReloadScrollTs');
}
