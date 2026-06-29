import { render, waitFor } from '@testing-library/react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useAuthStore } from '@/lib/store';

import { BusinessOnboardingGuard } from './BusinessOnboardingGuard';

const mockReplace = jest.fn();
const mockUsePathname = jest.fn(() => '/ru');
const mockSearchParams = new URLSearchParams();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/i18n', () => ({
  getClientLocale: () => 'ru',
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

function mockAuthStore(state: {
  user: {
    type: string;
    phoneVerified: boolean;
    companyName?: string | null;
  } | null;
  isInitialized: boolean;
}) {
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  });
}

describe('BusinessOnboardingGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/ru');
    Array.from(mockSearchParams.keys()).forEach((key) => mockSearchParams.delete(key));
    (useLocalizedNavigation as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  it('redirects when business onboarding is required', async () => {
    mockAuthStore({
      user: { type: 'Business', phoneVerified: true, companyName: '' },
      isInitialized: true,
    });

    render(<BusinessOnboardingGuard />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockReplace.mock.calls[0][0]).toContain('mode=business_onboarding');
  });

  it('does not redirect when company name is set', async () => {
    mockAuthStore({
      user: { type: 'Business', phoneVerified: true, companyName: 'Acme' },
      isInitialized: true,
    });

    render(<BusinessOnboardingGuard />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('does not redirect on exempt paths', async () => {
    mockUsePathname.mockReturnValue('/ru/sign');
    mockAuthStore({
      user: { type: 'Business', phoneVerified: true, companyName: '' },
      isInitialized: true,
    });

    render(<BusinessOnboardingGuard />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('does not redirect when already on business onboarding complete-profile', async () => {
    mockUsePathname.mockReturnValue('/ru/complete-profile');
    mockSearchParams.set('mode', 'business_onboarding');
    mockAuthStore({
      user: { type: 'Business', phoneVerified: true, companyName: '' },
      isInitialized: true,
    });

    render(<BusinessOnboardingGuard />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });
});
