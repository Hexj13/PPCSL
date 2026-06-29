import { render, screen } from '@testing-library/react';

import { useAuthStore } from '@/lib/store';

import { AuthGuardsShell } from './AuthGuardsShell';

jest.mock('./PhoneRequiredGuard', () => ({
  PhoneRequiredGuard: () => <div data-testid="phone-guard" />,
}));

jest.mock('./BusinessOnboardingGuard', () => ({
  BusinessOnboardingGuard: () => <div data-testid="business-guard" />,
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

type AuthSlice = {
  user: { id: string; phoneVerified: boolean } | null;
  isInitialized: boolean;
};

function mockAuthStore(state: AuthSlice) {
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  });
}

describe('AuthGuardsShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children for a guest when auth is not initialized', () => {
    mockAuthStore({ user: null, isInitialized: false });

    render(
      <AuthGuardsShell>
        <div data-testid="page-content">Page</div>
      </AuthGuardsShell>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-guard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('business-guard')).not.toBeInTheDocument();
  });

  it('renders children for a guest when initialized without a user', () => {
    mockAuthStore({ user: null, isInitialized: true });

    render(
      <AuthGuardsShell>
        <div data-testid="page-content">Page</div>
      </AuthGuardsShell>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-guard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('business-guard')).not.toBeInTheDocument();
  });

  it('keeps children mounted when auth becomes initialized with a user', () => {
    let authState: AuthSlice = { user: null, isInitialized: false };
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(authState);
      }
      return authState;
    });

    const child = <div data-testid="page-content">Page</div>;
    const { rerender } = render(<AuthGuardsShell>{child}</AuthGuardsShell>);

    const content = screen.getByTestId('page-content');
    expect(content).toBeInTheDocument();

    authState = { user: { id: '1', phoneVerified: true }, isInitialized: true };
    rerender(<AuthGuardsShell>{child}</AuthGuardsShell>);

    expect(screen.getByTestId('page-content')).toBe(content);
    expect(screen.getByTestId('phone-guard')).toBeInTheDocument();
    expect(screen.getByTestId('business-guard')).toBeInTheDocument();
  });

  it('mounts guards as siblings when user is authenticated', () => {
    mockAuthStore({
      user: { id: '1', phoneVerified: true },
      isInitialized: true,
    });

    render(
      <AuthGuardsShell>
        <div data-testid="page-content">Page</div>
      </AuthGuardsShell>,
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('phone-guard')).toBeInTheDocument();
    expect(screen.getByTestId('business-guard')).toBeInTheDocument();
  });
});
