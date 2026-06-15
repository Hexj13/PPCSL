'use client';

import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

const HOME_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;
const RELOAD_SCROLL_MAX_AGE_MS = 10 * 60 * 1000;
const CORRECTION_MAX_DURATION_MS = 3000;
const VIRTUALIZED_CORRECTION_MAX_DURATION_MS = 12000;
const VIRTUALIZED_RESTORE_MIN_LISTINGS = LISTING_GRID_PAGE_SIZE * 2 + 1;
const SCROLL_HEIGHT_TOLERANCE_PX = 32;
const POINTER_CANCEL_FALLBACK_MS = 750;

const HOME_RELOAD_GRID_HEIGHT_KEY = 'homeReloadGridHeight';
const HOME_RELOAD_VIEWPORT_W_KEY = 'homeReloadViewportW';
const HOME_RELOAD_LISTING_COUNT_KEY = 'homeReloadListingCount';
const GRID_STATE_KEY = 'kupito_grid_state';
const LISTING_GRID_PLACEHOLDER_SELECTOR = '[data-testid="listing-grid-placeholder"]';

const LISTING_CARD_TEST_ID_PREFIX = 'listing-card-';

export type HomeScrollRestoreSource = 'listing_return' | 'reload_or_back_forward';

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

let homeReloadPersistenceRegistered = false;
let homeReloadScrollSaveRaf: number | null = null;
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
  return isHomeScrollRestoreInProgress() && activeTarget?.source === 'listing_return';
}

export function clearHomeScrollRestoreSession(): void {
  sessionStorageRemoveItem('homeScrollPosition');
  sessionStorageRemoveItem('homeScrollListingId');
  sessionStorageRemoveItem('homeScrollTimestamp');
}

export function clearHomeReloadScrollKeys(): void {
  sessionStorageRemoveItem('homeReloadScrollY');
  sessionStorageRemoveItem('homeReloadScrollTs');
  sessionStorageRemoveItem(HOME_RELOAD_GRID_HEIGHT_KEY);
  sessionStorageRemoveItem(HOME_RELOAD_VIEWPORT_W_KEY);
  sessionStorageRemoveItem(HOME_RELOAD_LISTING_COUNT_KEY);
}

function isHomePathname(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const { restPath } = stripLocalePrefixFromPathname(window.location.pathname);
    return restPath === '/';
  } catch {
    return false;
  }
}

function canPersistReloadScrollState(): boolean {
  return phase === 'idle' || phase === 'done' || phase === 'cancelled';
}

function countListingCardsInDom(): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  let count = 0;
  const cards = document.querySelectorAll<HTMLElement>('[data-testid^="listing-card-"]');
  for (const el of cards) {
    const testId = el.getAttribute('data-testid');
    if (!testId || testId.includes('-link-') || !testId.startsWith(LISTING_CARD_TEST_ID_PREFIX)) {
      continue;
    }
    count += 1;
  }
  return count;
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
  return countListingCardsInDom();
}

function persistHomeReloadScrollPosition(): void {
  sessionStorageSetItem('homeReloadScrollY', String(window.scrollY));
  sessionStorageSetItem('homeReloadScrollTs', String(Date.now()));
}

export function persistHomeReloadScrollState(): void {
  if (typeof window === 'undefined' || !canPersistReloadScrollState()) {
    return;
  }
  persistHomeReloadScrollPosition();
  const gridEl = document.getElementById('listings-results');
  if (gridEl && gridEl.offsetHeight > 0) {
    sessionStorageSetItem(HOME_RELOAD_GRID_HEIGHT_KEY, String(gridEl.offsetHeight));
  }
  sessionStorageSetItem(HOME_RELOAD_VIEWPORT_W_KEY, String(window.innerWidth));
  const listingCount = readPersistedGridListingCount();
  if (listingCount > 0) {
    sessionStorageSetItem(HOME_RELOAD_LISTING_COUNT_KEY, String(listingCount));
  }
}

function persistHomeReloadScrollStateIfHome(): void {
  if (!isHomePathname() || !canPersistReloadScrollState()) {
    return;
  }
  persistHomeReloadScrollState();
}

function schedulePersistHomeReloadScrollStateIfHome(): void {
  if (homeReloadScrollSaveRaf !== null || !isHomePathname()) {
    return;
  }
  homeReloadScrollSaveRaf = requestAnimationFrame(() => {
    homeReloadScrollSaveRaf = null;
    if (!isHomePathname() || !canPersistReloadScrollState()) {
      return;
    }
    persistHomeReloadScrollPosition();
  });
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

export function ensureHomeReloadScrollPersistence(): void {
  if (typeof window === 'undefined' || homeReloadPersistenceRegistered) {
    return;
  }
  homeReloadPersistenceRegistered = true;
  window.addEventListener('pagehide', persistHomeReloadScrollStateIfHome);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persistHomeReloadScrollStateIfHome();
    }
  });
  window.addEventListener('scroll', schedulePersistHomeReloadScrollStateIfHome, { passive: true });
  window.addEventListener('wheel', cancelHomeScrollRestoreOnUserInteraction, { passive: true });
  window.addEventListener('touchmove', cancelHomeScrollRestoreOnUserInteraction, { passive: true });
  window.addEventListener('pointerdown', cancelHomeScrollRestoreOnUserInteraction, {
    passive: true,
  });
  window.addEventListener('keydown', cancelHomeScrollRestoreOnUserInteraction);
}

export function readPendingHomeReloadScrollY(): number | null {
  const savedReloadY = sessionStorageGetItem('homeReloadScrollY');
  const reloadTs = sessionStorageGetItem('homeReloadScrollTs');
  if (!savedReloadY || !reloadTs) {
    return null;
  }
  const savedTime = parseInt(reloadTs, 10);
  if (!Number.isFinite(savedTime) || Date.now() - savedTime > RELOAD_SCROLL_MAX_AGE_MS) {
    return null;
  }
  const scrollY = parseInt(savedReloadY, 10);
  return Number.isFinite(scrollY) && scrollY > 0 ? scrollY : null;
}

function readPersistedGridMinHeight(viewportW: number): number | null {
  const savedViewportW = parseInt(sessionStorageGetItem(HOME_RELOAD_VIEWPORT_W_KEY) ?? '', 10);
  const savedGridHeight = parseInt(sessionStorageGetItem(HOME_RELOAD_GRID_HEIGHT_KEY) ?? '', 10);
  if (!Number.isFinite(savedGridHeight) || savedGridHeight <= 0) {
    return null;
  }
  if (Number.isFinite(savedViewportW) && savedViewportW > 0 && savedViewportW !== viewportW) {
    return null;
  }
  return savedGridHeight;
}

export function readSavedGridMinHeightBeforeRestore(viewportW: number): number | null {
  const listingReturnTs = sessionStorageGetItem('homeScrollTimestamp');
  if (listingReturnTs) {
    const savedTime = parseInt(listingReturnTs, 10);
    if (Number.isFinite(savedTime) && Date.now() - savedTime < HOME_SCROLL_MAX_AGE_MS) {
      return readPersistedGridMinHeight(viewportW);
    }
  }
  const reloadTs = sessionStorageGetItem('homeReloadScrollTs');
  if (reloadTs) {
    const savedTime = parseInt(reloadTs, 10);
    if (Number.isFinite(savedTime) && Date.now() - savedTime < RELOAD_SCROLL_MAX_AGE_MS) {
      return readPersistedGridMinHeight(viewportW);
    }
  }
  return null;
}

export function getPendingRestoreMinHeight(viewportW: number): number | null {
  if (!isHomeScrollRestoreInProgress()) {
    return null;
  }
  return readPersistedGridMinHeight(viewportW);
}

export function isReloadOrBackForwardNavigation(): boolean {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navEntry?.type === 'reload' || navEntry?.type === 'back_forward';
  } catch {
    return false;
  }
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

function isBackForwardNavigation(): boolean {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navEntry?.type === 'back_forward';
  } catch {
    return false;
  }
}

function readListingReturnScrollTarget(
  previousPath: string | null,
): HomeScrollRestoreTarget | null {
  const savedScroll = sessionStorageGetItem('homeScrollPosition');
  const timestamp = sessionStorageGetItem('homeScrollTimestamp');
  const savedListingId = sessionStorageGetItem('homeScrollListingId');
  const canRestoreListingReturn =
    shouldRestoreHomeScrollAfterPath(previousPath) || Boolean(savedListingId);
  if (!savedScroll || !timestamp || !canRestoreListingReturn) {
    return null;
  }
  const savedTime = parseInt(timestamp, 10);
  if (Date.now() - savedTime >= HOME_SCROLL_MAX_AGE_MS) {
    clearHomeScrollRestoreSession();
    sessionStorageRemoveItem('kupito_grid_state');
    sessionStorageRemoveItem('kupito_grid_restore_state');
    return null;
  }
  const scrollY = parseInt(savedScroll, 10);
  if (!Number.isFinite(scrollY) || scrollY <= 0) {
    clearHomeScrollRestoreSession();
    return null;
  }
  return { scrollY, source: 'listing_return', listingId: savedListingId ?? undefined };
}

function readReloadScrollTarget(): HomeScrollRestoreTarget | null {
  const savedReloadY = sessionStorageGetItem('homeReloadScrollY');
  const reloadTs = sessionStorageGetItem('homeReloadScrollTs');
  if (!savedReloadY || !reloadTs) {
    return null;
  }
  const savedTime = parseInt(reloadTs, 10);
  const reloadStateAgeMs = Number.isFinite(savedTime) ? Date.now() - savedTime : Infinity;
  if (reloadStateAgeMs >= RELOAD_SCROLL_MAX_AGE_MS) {
    clearHomeReloadScrollKeys();
    return null;
  }
  const scrollY = parseInt(savedReloadY, 10);
  if (!Number.isFinite(scrollY) || scrollY <= 0) {
    clearHomeReloadScrollKeys();
    return null;
  }
  return { scrollY, source: 'reload_or_back_forward' };
}

export function readHomeScrollRestoreTarget(
  previousPath: string | null,
): HomeScrollRestoreTarget | null {
  try {
    if (isBackForwardNavigation()) {
      const listingReturn = readListingReturnScrollTarget(previousPath);
      if (listingReturn) {
        return listingReturn;
      }
      const reloadTarget = readReloadScrollTarget();
      if (reloadTarget) {
        return reloadTarget;
      }
    }

    if (isReloadNavigation()) {
      const reloadTarget = readReloadScrollTarget();
      if (reloadTarget) {
        return reloadTarget;
      }
    }

    if (!isReloadNavigation() && !isBackForwardNavigation()) {
      const listingReturn = readListingReturnScrollTarget(previousPath);
      if (listingReturn) {
        return listingReturn;
      }
      return null;
    }
  } catch {
    // noop
  }

  return null;
}

function canScrollToY(scrollY: number): boolean {
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
  return maxScrollY >= scrollY - SCROLL_HEIGHT_TOLERANCE_PX;
}

function applyGridMinHeightPlaceholder(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const height = readSavedGridMinHeightBeforeRestore(window.innerWidth);
  if (!height) {
    return;
  }
  const placeholder = document.querySelector(LISTING_GRID_PLACEHOLDER_SELECTOR);
  if (placeholder instanceof HTMLElement) {
    placeholder.style.minHeight = `${height}px`;
  }
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
  const target = activeTarget;
  activeTarget = null;
  gridReady = false;
  bannerDecided = false;
  reportedListingsCount = 0;
  setPhase('done');
  if (reached && target?.source === 'reload_or_back_forward') {
    persistHomeReloadScrollState();
  }
  if (reached && target?.source === 'listing_return') {
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
  const savedCount = parseInt(sessionStorageGetItem(HOME_RELOAD_LISTING_COUNT_KEY) ?? '', 10);
  const listingCount = Math.max(
    Number.isFinite(savedCount) ? savedCount : 0,
    reportedListingsCount,
  );
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

export function prepareHomeScrollRestoreGridLayout(): void {
  if (phase !== 'pending' || !activeTarget) {
    return;
  }
  applyGridMinHeightPlaceholder();
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
  prepareHomeScrollRestoreGridLayout();
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
