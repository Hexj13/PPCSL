/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';

import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { toast } from '@/lib/toast';

import { ProfileSaveSuccessToast } from './ProfileSaveSuccessToast';

const mockUsePathname = jest.fn(() => '/ru');

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: jest.fn(),
  localStorageRemoveItem: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn() },
}));

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: (pathname: string) => {
    if (pathname === '/ru') return { locale: 'ru', restPath: '/' };
    if (pathname.startsWith('/ru/')) {
      return { locale: 'ru', restPath: pathname.slice('/ru'.length) };
    }
    return { locale: 'ro', restPath: pathname || '/' };
  },
}));

describe('ProfileSaveSuccessToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/ru');
    (localStorageGetItem as jest.Mock).mockImplementation((key: string) =>
      key === 'showProfileDeleteSuccess' ? 'true' : null,
    );
  });

  it('does not show account deletion success before reaching home', async () => {
    mockUsePathname.mockReturnValue('/ru/profile');

    render(<ProfileSaveSuccessToast />);

    await waitFor(() => {
      expect(localStorageGetItem).toHaveBeenCalledWith('showProfileDeleteSuccess');
    });
    expect(localStorageRemoveItem).not.toHaveBeenCalledWith('showProfileDeleteSuccess');
    expect(toast.success).not.toHaveBeenCalledWith('profile.deleteSuccess');
  });

  it('shows account deletion success on home', async () => {
    render(<ProfileSaveSuccessToast />);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('profile.deleteSuccess');
    });
    expect(localStorageRemoveItem).toHaveBeenCalledWith('showProfileDeleteSuccess');
  });
});
