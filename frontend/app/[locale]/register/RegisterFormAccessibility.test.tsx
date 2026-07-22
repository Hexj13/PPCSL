/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { RegisterFormTerms } from './RegisterFormTerms';
import { UserTypeSwitcher } from './UserTypeSwitcher';
import type { RegisterFormState } from './useRegisterPage';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    href: (path: string) => path,
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('register form accessibility controls', () => {
  it('exposes user type radios with checked state and disabled support', () => {
    const onChange = jest.fn();
    render(
      <UserTypeSwitcher
        value="Individual"
        onChange={onChange}
        individualTestId="type-individual"
        businessTestId="type-business"
        disabled
      />,
    );

    const individual = screen.getByTestId('type-individual');
    const business = screen.getByTestId('type-business');
    expect(individual).toHaveAttribute('role', 'radio');
    expect(individual).toHaveAttribute('aria-checked', 'true');
    expect(business).toHaveAttribute('aria-checked', 'false');
    expect(individual).toBeDisabled();
    expect(business).toBeDisabled();
  });

  it('uses a single native checkbox for terms acceptance', () => {
    const setFormData = jest.fn((updater: (prev: RegisterFormState) => RegisterFormState) => {
      updater({
        email: '',
        password: '',
        type: 'Individual',
        phone: '',
        firstName: '',
        lastName: '',
        companyName: '',
        emailNotifications: false,
        viber: false,
        whatsapp: false,
        telegram: false,
        termsAccepted: false,
      });
    });

    render(
      <RegisterFormTerms
        formData={
          {
            email: '',
            password: '',
            type: 'Individual',
            phone: '',
            firstName: '',
            lastName: '',
            companyName: '',
            emailNotifications: false,
            viber: false,
            whatsapp: false,
            telegram: false,
            termsAccepted: false,
          } as RegisterFormState
        }
        setFormData={setFormData as never}
      />,
    );

    const checkbox = screen.getByTestId('auth-register-terms-input');
    expect(checkbox).toHaveAttribute('type', 'checkbox');
    fireEvent.click(checkbox);
    expect(setFormData).toHaveBeenCalled();
  });
});
