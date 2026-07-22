/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import type { User } from '@/lib/api';

import { PhoneRequiredStep } from './PhoneRequiredStep';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams(
  'mode=phone_required&source=google_register&selectedType=Business',
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    updateProfile: jest.fn(),
    me: jest.fn(),
    sendSms: jest.fn(),
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/app/[locale]/register/RegisterFormMessengers', () => ({
  RegisterFormMessengers: () => null,
}));

const authStoreState: { user: User | null; setAuth: jest.Mock } = {
  user: {
    id: 'user-1',
    email: 'biz@example.com',
    type: 'Individual',
    phoneVerified: false,
  },
  setAuth: jest.fn(),
};

jest.mock('@/lib/store', () => ({
  useAuthStore: () => authStoreState,
}));

const activeTypeClass = 'border-primary-700';

describe('PhoneRequiredStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams(
      'mode=phone_required&source=google_register&selectedType=Business',
    );
    authStoreState.user = {
      id: 'user-1',
      email: 'biz@example.com',
      type: 'Individual',
      phoneVerified: false,
    };
  });

  it('renders Business as active on first paint when selectedType=Business', () => {
    render(<PhoneRequiredStep returnUrl={null} />);

    const business = screen.getByTestId('complete-profile-phone-required-type-business');
    const individual = screen.getByTestId('complete-profile-phone-required-type-individual');

    expect(business.className).toContain(activeTypeClass);
    expect(individual.className).not.toContain(activeTypeClass);
  });

  it('renders Individual as active when selectedType is absent and user is Individual', () => {
    mockSearchParams = new URLSearchParams('mode=phone_required');
    authStoreState.user = {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: false,
    };

    render(<PhoneRequiredStep returnUrl={null} />);

    const business = screen.getByTestId('complete-profile-phone-required-type-business');
    const individual = screen.getByTestId('complete-profile-phone-required-type-individual');

    expect(individual.className).toContain(activeTypeClass);
    expect(business.className).not.toContain(activeTypeClass);
  });
});
