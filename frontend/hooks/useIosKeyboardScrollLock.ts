'use client';

import { type RefObject, useEffect } from 'react';

const FOCUSABLE_INPUT_SELECTOR =
  'input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled])';

function isFocusableInput(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.matches(FOCUSABLE_INPUT_SELECTOR);
}

function getScrollParent(element: Element): Element {
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

function scrollInputIntoSheetView(target: HTMLElement, sheetRoot: HTMLElement) {
  const scrollable = getScrollParent(target);
  if (!sheetRoot.contains(scrollable) || scrollable === document.documentElement) {
    return;
  }
  const scrollableTop = scrollable.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const targetBottom = target.getBoundingClientRect().bottom;
  const scrollableBottom = scrollable.getBoundingClientRect().bottom;
  if (targetBottom > scrollableBottom) {
    scrollable.scrollTop += targetBottom - scrollableBottom;
  } else if (targetTop < scrollableTop) {
    scrollable.scrollTop += targetTop - scrollableTop;
  }
}

export function useIosKeyboardScrollLock(
  enabled: boolean,
  sheetRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.dataset.bottomSheetScrollLock = 'true';

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const sheetRoot = sheetRef.current;
      if (!isFocusableInput(target) || !sheetRoot?.contains(target)) {
        return;
      }
      requestAnimationFrame(() => {
        scrollInputIntoSheetView(target, sheetRoot);
      });
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      delete body.dataset.bottomSheetScrollLock;
    };
  }, [enabled, sheetRef]);
}
