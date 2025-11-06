import { render } from '@testing-library/react';
import React from 'react';

import { useAuthStore } from '@/lib/store';

import { AuthProvider } from './AuthProvider';

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

describe('AuthProvider', () => {
  const mockInitAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ initAuth: mockInitAuth });
      }
      return mockInitAuth;
    });
  });

  it('should call initAuth on mount', () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    expect(mockInitAuth).toHaveBeenCalledTimes(1);
  });

  it('should render children', () => {
    const { getByText } = render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>,
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('should use initAuth from store', () => {
    const selector = jest.fn((state) => state.initAuth);
    (useAuthStore as unknown as jest.Mock).mockImplementation(selector);

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    expect(selector).toHaveBeenCalled();
  });
});

