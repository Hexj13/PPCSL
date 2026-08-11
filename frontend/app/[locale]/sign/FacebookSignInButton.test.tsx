import { render, screen } from '@testing-library/react';

import { FacebookSignInButton } from './FacebookSignInButton';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('FacebookSignInButton', () => {
  it('uses brand Facebook color for the icon-only button', () => {
    render(
      <FacebookSignInButton
        clientIdConfigured={true}
        libraryStatus="ready"
        onFacebookClick={jest.fn()}
      />,
    );

    const button = screen.getByTestId('auth-facebook');
    expect(button.innerHTML).toContain('text-brand-facebook');
    expect(button).toHaveAccessibleName('sign.continueWithFacebook');
    expect(button).not.toHaveTextContent('sign.continueWithFacebook');
  });

  it('uses brand facebook color for the loading spinner', () => {
    render(
      <FacebookSignInButton
        clientIdConfigured={true}
        libraryStatus="ready"
        loading={true}
        onFacebookClick={jest.fn()}
      />,
    );

    expect(screen.getByTestId('auth-facebook-loading')).toHaveClass('text-brand-facebook');
  });
});
