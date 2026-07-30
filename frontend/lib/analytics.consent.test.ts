/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockIsAnalyticsConsentGranted = jest.fn(() => false);

jest.mock('./cookie-consent', () => ({
  isAnalyticsConsentGranted: () => mockIsAnalyticsConsentGranted(),
}));

import { invalidateConsentCache, trackEvent } from './analytics';

describe('analytics checkConsent', () => {
  beforeEach(() => {
    invalidateConsentCache();
    mockIsAnalyticsConsentGranted.mockReset();
    mockIsAnalyticsConsentGranted.mockReturnValue(false);
    window.gtag = jest.fn();
    window.dataLayer = [];
  });

  it('does not send events when analytics consent is not granted', () => {
    mockIsAnalyticsConsentGranted.mockReturnValue(false);
    trackEvent('view_item', { item_id: '1' });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends events when shared cookie-first consent is granted', () => {
    mockIsAnalyticsConsentGranted.mockReturnValue(true);
    trackEvent('view_item', { item_id: '1' });
    expect(window.gtag).toHaveBeenCalledWith('event', 'view_item', { item_id: '1' });
  });

  it('caches consent until invalidateConsentCache', () => {
    mockIsAnalyticsConsentGranted.mockReturnValue(true);
    trackEvent('search', {});
    expect(mockIsAnalyticsConsentGranted).toHaveBeenCalledTimes(1);

    trackEvent('search', {});
    expect(mockIsAnalyticsConsentGranted).toHaveBeenCalledTimes(1);

    invalidateConsentCache();
    mockIsAnalyticsConsentGranted.mockReturnValue(false);
    trackEvent('search', {});
    expect(mockIsAnalyticsConsentGranted).toHaveBeenCalledTimes(2);
    expect(window.gtag).toHaveBeenCalledTimes(2);
  });
});
