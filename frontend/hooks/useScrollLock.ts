'use client';

import { useLayoutEffect } from 'react';

let scrollLockDepth = 0;
let lockedScrollY = 0;
let bodyStyleSnapshot: {
  position: string;
  top: string;
  width: string;
  left: string;
} | null = null;

function acquireScrollLock() {
  if (scrollLockDepth === 0) {
    lockedScrollY = window.scrollY;
    const body = document.body;
    bodyStyleSnapshot = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      left: body.style.left,
    };
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.width = '100%';
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

  const body = document.body;
  if (bodyStyleSnapshot) {
    body.style.position = bodyStyleSnapshot.position;
    body.style.top = bodyStyleSnapshot.top;
    body.style.width = bodyStyleSnapshot.width;
    body.style.left = bodyStyleSnapshot.left;
  }
  bodyStyleSnapshot = null;
  window.scrollTo(0, lockedScrollY);
}

export function useScrollLock(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) {
      return undefined;
    }
    acquireScrollLock();
    return () => {
      releaseScrollLock();
    };
  }, [enabled]);
}
