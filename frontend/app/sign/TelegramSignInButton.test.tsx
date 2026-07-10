import { render, screen } from '@testing-library/react';

import { TelegramSignInButton } from './TelegramSignInButton';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TelegramSignInButton', () => {
  it('uses brand Telegram color for the icon-only button', () => {
    render(
      <TelegramSignInButton
        clientIdConfigured={true}
        libraryStatus="ready"
        onTelegramClick={jest.fn()}
      />,
    );

    const button = screen.getByTestId('auth-telegram');
    expect(button.innerHTML).toContain('text-brand-telegram');
    expect(button).toHaveAccessibleName('sign.continueWithTelegram');
    expect(button).not.toHaveTextContent('sign.continueWithTelegram');
  });

  it('uses brand telegram color for the loading spinner', () => {
    render(
      <TelegramSignInButton
        clientIdConfigured={true}
        libraryStatus="ready"
        loading={true}
        onTelegramClick={jest.fn()}
      />,
    );

    expect(screen.getByTestId('auth-telegram-loading')).toHaveClass('text-brand-telegram');
  });
});
