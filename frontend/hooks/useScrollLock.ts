'use client';

import { useEffect } from 'react';

let scrollLockDepth = 0;
let lockedScrollY = 0;
let releaseToTopNext = false;
let releaseToYNext: number | null = null;
let releaseThenNext: (() => void) | null = null;
let bodyStyleSnapshot: {
  position: string;
  top: string;
  width: string;
  left: string;
  overscrollBehavior: string;
} | null = null;
let htmlStyleSnapshot: {
  overflow: string;
  overscrollBehavior: string;
} | null = null;

function restoreBodyStyles() {
  const body = document.body;
  if (bodyStyleSnapshot) {
    body.style.position = bodyStyleSnapshot.position;
    body.style.top = bodyStyleSnapshot.top;
    body.style.width = bodyStyleSnapshot.width;
    body.style.left = bodyStyleSnapshot.left;
    body.style.overscrollBehavior = bodyStyleSnapshot.overscrollBehavior;
    bodyStyleSnapshot = null;
  }
  if (htmlStyleSnapshot) {
    document.documentElement.style.overflow = htmlStyleSnapshot.overflow;
    document.documentElement.style.overscrollBehavior = htmlStyleSnapshot.overscrollBehavior;
    htmlStyleSnapshot = null;
  }
}

function acquireScrollLock() {
  if (scrollLockDepth === 0) {
    lockedScrollY = window.scrollY;
    const body = document.body;
    bodyStyleSnapshot = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      left: body.style.left,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    htmlStyleSnapshot = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    };
    body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
  }
  scrollLockDepth += 1;
}

function releaseScrollLock() {
  if (scrollLockDepth === 0) {
    return;
  }
  scrollLockDepth -= 1;
  if (scrollLockDepth > 0) {
    return;
  }

  restoreBodyStyles();
  const thenCb = releaseThenNext;
  releaseThenNext = null;
  const targetY = releaseToYNext ?? (releaseToTopNext ? 0 : lockedScrollY);
  releaseToYNext = null;
  releaseToTopNext = false;
  window.scrollTo(0, targetY);
  if (thenCb) {
    if (typeof window.requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        thenCb();
      });
    } else {
      thenCb();
    }
    return;
  }
  if (typeof window.requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.scrollY !== targetY) {
          window.scrollTo(0, targetY);
        }
      });
    });
  }
}

export function isScrollLockActive(): boolean {
  return scrollLockDepth > 0;
}

export function prepareScrollLockReleaseToTop() {
  if (scrollLockDepth > 0) {
    releaseToTopNext = true;
    releaseToYNext = null;
    releaseThenNext = null;
  }
}

export function prepareScrollLockReleaseTo(scrollY: number) {
  if (scrollLockDepth > 0) {
    releaseToYNext = scrollY;
    releaseToTopNext = false;
    releaseThenNext = null;
  }
}

export function prepareScrollLockReleaseThen(callback: () => void) {
  if (scrollLockDepth > 0) {
    releaseThenNext = callback;
    releaseToYNext = null;
    releaseToTopNext = false;
  }
}

export function forceReleaseScrollLockToTop() {
  if (scrollLockDepth === 0) {
    return;
  }
  scrollLockDepth = 0;
  restoreBodyStyles();
  releaseToTopNext = false;
  releaseToYNext = null;
  releaseThenNext = null;
  window.scrollTo(0, 0);
}

export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    acquireScrollLock();
    return () => {
      releaseScrollLock();
    };
  }, [enabled]);
}
