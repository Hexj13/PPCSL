import { render, waitFor } from '@testing-library/react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useAuthStore } from '@/lib/store';

import { PhoneRequiredGuard } from './PhoneRequiredGuard';

const mockReplace = jest.fn();
const mockUsePathname = jest.fn(() => '/ru');

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/lib/i18n', () => ({
  getClientLocale: () => 'ru',
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

function mockAuthStore(state: { user: { phoneVerified: boolean } | null; isInitialized: boolean }) {
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  });
}

describe('PhoneRequiredGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/ru');
    (useLocalizedNavigation as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  it('redirects when phone is not verified', async () => {
    mockAuthStore({
      user: { phoneVerified: false },
      isInitialized: true,
    });

    render(<PhoneRequiredGuard />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockReplace.mock.calls[0][0]).toContain('mode=phone_required');
  });

  it('does not redirect when phone is verified', async () => {
    mockAuthStore({
      user: { phoneVerified: true },
      isInitialized: true,
    });

    render(<PhoneRequiredGuard />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('does not redirect on exempt paths', async () => {
    mockUsePathname.mockReturnValue('/ru/complete-profile');
    mockAuthStore({
      user: { phoneVerified: false },
      isInitialized: true,
    });

    render(<PhoneRequiredGuard />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });
});
