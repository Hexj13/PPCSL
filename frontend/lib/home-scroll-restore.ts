'use client';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';

const HOME_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;
const CORRECTION_MAX_DURATION_MS = 3000;
const VIRTUALIZED_CORRECTION_MAX_DURATION_MS = 12000;
const VIRTUALIZED_RESTORE_MIN_LISTINGS = LISTING_GRID_PAGE_SIZE * 2 + 1;
const SCROLL_HEIGHT_TOLERANCE_PX = 32;
const POINTER_CANCEL_FALLBACK_MS = 750;

const GRID_STATE_KEY = 'ppcsl_grid_state';

export type HomeScrollRestoreSource = 'listing_return';

export type HomeScrollRestorePhase =
  | 'idle'
  | 'pending'
  | 'scrolled'
  | 'correcting'
  | 'done'
  | 'cancelled';

export type HomeScrollRestoreTarget = {
  scrollY: number;
  source: HomeScrollRestoreSource;
  listingId?: string;
};

type StateChangeListener = (phase: HomeScrollRestorePhase) => void;

let interactionListenersRegistered = false;
let deferredPointerCancelTimeoutId: ReturnType<typeof setTimeout> | null = null;
let deferredPointerCancelClickHandler: (() => void) | null = null;

let phase: HomeScrollRestorePhase = 'idle';
let activeTarget: HomeScrollRestoreTarget | null = null;
let gridReady = false;
let bannerDecided = false;
let reportedListingsCount = 0;
let correctionRafId: number | null = null;
let correctionStart = 0;

const stateChangeListeners = new Set<StateChangeListener>();

function notifyPhaseChange(): void {
  for (const listener of stateChangeListeners) {
    listener(phase);
  }
}

function setPhase(next: HomeScrollRestorePhase): void {
  phase = next;
  notifyPhaseChange();
}

export function subscribeHomeScrollRestoreState(listener: StateChangeListener): () => void {
  stateChangeListeners.add(listener);
  return () => {
    stateChangeListeners.delete(listener);
  };
}

export function getHomeScrollRestorePhase(): HomeScrollRestorePhase {
  return phase;
}

export function isHomeScrollRestoreInProgress(): boolean {
  return phase === 'pending' || phase === 'scrolled' || phase === 'correcting';
}

export function isHomeScrollRestoreActive(): boolean {
  return isHomeScrollRestoreInProgress();
}

export function shouldDeferVirtualSwapForHomeScrollRestore(): boolean {
  return isHomeScrollRestoreInProgress();
}

export function clearHomeScrollRestoreSession(): void {
  sessionStorageRemoveItem('homeScrollPosition');
  sessionStorageRemoveItem('homeScrollListingId');
  sessionStorageRemoveItem('homeScrollTimestamp');
}

function readPersistedGridListingCount(): number {
  const gridRaw = sessionStorageGetItem(GRID_STATE_KEY);
  if (gridRaw) {
    try {
      const state = JSON.parse(gridRaw) as { listings?: unknown[] };
      if (Array.isArray(state.listings) && state.listings.length > 0) {
        return state.listings.length;
      }
    } catch {
      // noop
    }
  }
  return 0;
}

function clearDeferredPointerCancel(): void {
  if (deferredPointerCancelTimeoutId !== null) {
    clearTimeout(deferredPointerCancelTimeoutId);
    deferredPointerCancelTimeoutId = null;
  }
  if (deferredPointerCancelClickHandler !== null && typeof window !== 'undefined') {
    window.removeEventListener('click', deferredPointerCancelClickHandler);
    deferredPointerCancelClickHandler = null;
  }
}

function runDeferredPointerCancel(): void {
  clearDeferredPointerCancel();
  cancelHomeScrollRestore();
}

function schedulePointerCancelAfterClick(): void {
  clearDeferredPointerCancel();

  deferredPointerCancelClickHandler = () => {
    if (deferredPointerCancelTimeoutId !== null) {
      clearTimeout(deferredPointerCancelTimeoutId);
    }
    deferredPointerCancelTimeoutId = setTimeout(runDeferredPointerCancel, 0);
  };

  window.addEventListener('click', deferredPointerCancelClickHandler, {
    once: true,
    passive: true,
  });
  deferredPointerCancelTimeoutId = setTimeout(runDeferredPointerCancel, POINTER_CANCEL_FALLBACK_MS);
}

function cancelHomeScrollRestoreOnUserInteraction(event: Event): void {
  if (!isHomeScrollRestoreInProgress()) {
    return;
  }
  if (event.type === 'pointerdown') {
    schedulePointerCancelAfterClick();
    return;
  }
  clearDeferredPointerCancel();
  cancelHomeScrollRestore();
}

export function ensureHomeScrollRestoreInteractionListeners(): void {
  if (typeof window === 'undefined' || interactionListenersRegistered) {
    return;
  }
  interactionListenersRegistered = true;
  window.addEventListener('wheel', cancelHomeScrollRestoreOnUserInteraction, { passive: true });
  window.addEventListener('touchmove', cancelHomeScrollRestoreOnUserInteraction, { passive: true });
  window.addEventListener('pointerdown', cancelHomeScrollRestoreOnUserInteraction, {
    passive: true,
  });
  window.addEventListener('keydown', cancelHomeScrollRestoreOnUserInteraction);
}

export function isReloadNavigation(): boolean {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navEntry?.type === 'reload';
  } catch {
    return false;
  }
}

function readListingReturnScrollTarget(
  previousPath: string | null,
  allowSavedListingIdFallback = true,
): HomeScrollRestoreTarget | null {
  const savedScroll = sessionStorageGetItem('homeScrollPosition');
  const timestamp = sessionStorageGetItem('homeScrollTimestamp');
  const savedListingId = sessionStorageGetItem('homeScrollListingId');
  const canRestoreListingReturn =
    shouldRestoreHomeScrollAfterPath(previousPath) ||
    (allowSavedListingIdFallback && Boolean(savedListingId));
  if (!savedScroll || !timestamp || !canRestoreListingReturn) {
    return null;
  }
  const savedTime = parseInt(timestamp, 10);
  if (Date.now() - savedTime >= HOME_SCROLL_MAX_AGE_MS) {
    clearHomeScrollRestoreSession();
    sessionStorageRemoveItem('ppcsl_grid_state');
    sessionStorageRemoveItem('ppcsl_grid_restore_state');
    return null;
  }
  const scrollY = parseInt(savedScroll, 10);
  if (!Number.isFinite(scrollY) || scrollY <= 0) {
    clearHomeScrollRestoreSession();
    return null;
  }
  return { scrollY, source: 'listing_return', listingId: savedListingId ?? undefined };
}

export function readHomeScrollRestoreTarget(
  previousPath: string | null,
): HomeScrollRestoreTarget | null {
  try {
    const isReload = isReloadNavigation();
    const listingReturn = readListingReturnScrollTarget(previousPath, !isReload);
    if (listingReturn) {
      return listingReturn;
    }
    if (isReload) {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function canScrollToY(scrollY: number): boolean {
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
  return maxScrollY >= scrollY - SCROLL_HEIGHT_TOLERANCE_PX;
}

function scrollToYInstant(scrollY: number): void {
  if (!Number.isFinite(scrollY) || scrollY <= 0) {
    return;
  }
  if (!canScrollToY(scrollY)) {
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: maxScrollY, left: 0, behavior: 'instant' });
    return;
  }
  if (Math.abs(window.scrollY - scrollY) > 2) {
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
  }
}

function cleanupCorrection(): void {
  if (correctionRafId !== null) {
    cancelAnimationFrame(correctionRafId);
    correctionRafId = null;
  }
}

function finishRestore(reached: boolean): void {
  cleanupCorrection();
  activeTarget = null;
  gridReady = false;
  bannerDecided = false;
  reportedListingsCount = 0;
  setPhase('done');
  if (reached) {
    clearHomeScrollRestoreSession();
  }
}

export function cancelHomeScrollRestore(): void {
  clearDeferredPointerCancel();
  if (!isHomeScrollRestoreInProgress()) {
    return;
  }
  cleanupCorrection();
  activeTarget = null;
  gridReady = false;
  bannerDecided = false;
  reportedListingsCount = 0;
  setPhase('cancelled');
}

function correctionNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function getCorrectionMaxDurationMs(): number {
  const listingCount = Math.max(readPersistedGridListingCount(), reportedListingsCount);
  if (listingCount >= VIRTUALIZED_RESTORE_MIN_LISTINGS) {
    return VIRTUALIZED_CORRECTION_MAX_DURATION_MS;
  }
  return CORRECTION_MAX_DURATION_MS;
}

function runCorrectionStep(): void {
  if (phase !== 'correcting' || !activeTarget) {
    return;
  }

  const { scrollY } = activeTarget;
  let reached = false;
  const timedOut = correctionNow() - correctionStart >= getCorrectionMaxDurationMs();

  if (canScrollToY(scrollY)) {
    scrollToYInstant(scrollY);
    reached = Math.abs(window.scrollY - scrollY) <= 2;
  }

  if (reached || timedOut) {
    if (!reached && canScrollToY(scrollY)) {
      scrollToYInstant(scrollY);
      reached = Math.abs(window.scrollY - scrollY) <= 2;
    }
    finishRestore(reached);
    return;
  }

  correctionRafId = requestAnimationFrame(() => {
    correctionRafId = null;
    runCorrectionStep();
  });
}

function tryStartCorrection(): void {
  if (phase !== 'scrolled' || !activeTarget) {
    return;
  }
  if (!gridReady || !bannerDecided) {
    return;
  }
  setPhase('correcting');
  correctionStart = correctionNow();
  runCorrectionStep();
}

export function beginHomeScrollRestore(target: HomeScrollRestoreTarget): void {
  if (typeof window === 'undefined' || !Number.isFinite(target.scrollY) || target.scrollY <= 0) {
    return;
  }
  if (phase !== 'idle' && phase !== 'done' && phase !== 'cancelled') {
    return;
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  activeTarget = target;
  gridReady = false;
  bannerDecided = false;
  reportedListingsCount = 0;
  setPhase('pending');
}

export function applyHomeScrollRestoreScrollPosition(): void {
  if (phase !== 'pending' || !activeTarget) {
    return;
  }
  scrollToYInstant(activeTarget.scrollY);
  setPhase('scrolled');
}

export function reapplyHomeScrollRestoreScrollPosition(): void {
  if (!activeTarget || phase === 'idle' || phase === 'done' || phase === 'cancelled') {
    return;
  }
  scrollToYInstant(activeTarget.scrollY);
}

export function applyHomeScrollRestoreWhenGridReady(): void {
  applyHomeScrollRestoreScrollPosition();
}

export function reportGridReady(listingsCount: number): void {
  if (phase !== 'scrolled' && phase !== 'correcting') {
    return;
  }
  if (Number.isFinite(listingsCount) && listingsCount > 0) {
    reportedListingsCount = Math.max(reportedListingsCount, listingsCount);
  }
  gridReady = true;
  tryStartCorrection();
}

export function reportBannerDecided(): void {
  if (phase !== 'scrolled' && phase !== 'correcting') {
    return;
  }
  bannerDecided = true;
  tryStartCorrection();
}

export function resetHomeScrollRestoreForTests(): void {
  clearDeferredPointerCancel();
  cancelHomeScrollRestore();
  cleanupCorrection();
  activeTarget = null;
  gridReady = false;
  bannerDecided = false;
  setPhase('idle');
}
