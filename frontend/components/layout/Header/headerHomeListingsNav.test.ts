/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';

import { useScrollLock } from '@/hooks/useScrollLock';

import {
  getHomeListingsScrollTargetY,
  handleHeaderListingsNavClick,
  scrollToHomeListings,
} from './headerHomeListingsNav';

function createClickEvent(): MouseEvent<HTMLAnchorElement> {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    preventDefault: jest.fn(),
  } as unknown as MouseEvent<HTMLAnchorElement>;
}

describe('headerHomeListingsNav', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    let rafId = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const id = ++rafId;
      setTimeout(() => callback(performance.now()), 0);
      return id;
    };
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    window.scrollTo = jest.fn();

    const listingsEl = document.createElement('div');
    listingsEl.id = 'home-listings';
    listingsEl.getBoundingClientRect = () =>
      ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(listingsEl);

    const headerEl = document.createElement('header');
    headerEl.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 72,
        left: 0,
        right: 0,
        width: 0,
        height: 72,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(headerEl);
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('computes home listings scroll target below the header', () => {
    expect(getHomeListingsScrollTargetY()).toBe(504);
  });

  it('scrolls to home listings when scroll lock is not active', () => {
    const onBeforeNavigate = jest.fn();
    handleHeaderListingsNavClick(createClickEvent(), {
      pathname: '/',
      homeHref: '/',
      push: jest.fn(),
      onBeforeNavigate,
    });

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 504, behavior: 'smooth' });
  });

  it('prepares scroll lock release to listings target when menu is open on home', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    const onBeforeNavigate = jest.fn();

    handleHeaderListingsNavClick(createClickEvent(), {
      pathname: '/ru',
      homeHref: '/ru',
      push: jest.fn(),
      onBeforeNavigate,
    });

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 504, behavior: 'smooth' });

    act(() => {
      unmount();
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 504);
  });

  it('navigates to home and scrolls to top from a non-home page', () => {
    const push = jest.fn();
    const onBeforeNavigate = jest.fn();

    handleHeaderListingsNavClick(createClickEvent(), {
      pathname: '/favorites',
      homeHref: '/',
      push,
      onBeforeNavigate,
    });

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('scrollToHomeListings uses smooth scroll to computed target', () => {
    scrollToHomeListings();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 504, behavior: 'smooth' });
  });
});
