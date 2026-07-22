/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { getMetadataLocale, resolveMetadataLocale } from './i18n';

describe('resolveMetadataLocale', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('returns ru when locale param is ru', () => {
    expect(resolveMetadataLocale('ru')).toBe('ru');
  });

  it('returns default locale when param is missing', () => {
    expect(resolveMetadataLocale(undefined)).toBe('ro');
  });

  it('returns default locale when switcher is disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'false';
    expect(getMetadataLocale('ru')).toBe('ro');
  });
});
