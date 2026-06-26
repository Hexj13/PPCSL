import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, type RefObject } from 'react';

import { AuthOAuthOutsideCard } from './AuthOAuthOutsideCard';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/app/sign/AuthOAuthConsent', () => ({
  AuthOAuthConsent: () => <div data-testid="auth-oauth-consent" />,
}));

jest.mock('@/app/sign/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) => (
    <div data-testid="mock-google-button">
      <div ref={containerRef} />
    </div>
  ),
}));

jest.mock('@/app/sign/TelegramSignInButton', () => ({
  TelegramSignInButton: () => <button type="button">Telegram</button>,
}));

function renderOAuthOutsideCard({
  gisReady,
  isButtonReady,
  markGoogleSignInIntent = jest.fn(),
}: {
  gisReady: boolean;
  isButtonReady: boolean;
  markGoogleSignInIntent?: jest.Mock;
}) {
  render(
    <AuthOAuthOutsideCard
      googleClientIdConfigured={true}
      telegramClientIdConfigured={false}
      gisReady={gisReady}
      googleAuth={{
        isButtonReady,
        containerRef: createRef<HTMLDivElement>(),
        clientIdConfigured: true,
        isGoogleBusy: false,
        markGoogleSignInIntent,
      }}
      telegramAuth={{
        clientIdConfigured: false,
        libraryStatus: 'unavailable',
        isTelegramBusy: false,
        signInWithDevMock: jest.fn(),
        signInWithTelegram: jest.fn(),
      }}
      googleDisabled={false}
      authSubmitBusy={false}
    />,
  );
}

describe('AuthOAuthOutsideCard', () => {
  it('does not mark Google sign-in intent while the button is still loading', () => {
    const markGoogleSignInIntent = jest.fn();

    renderOAuthOutsideCard({
      gisReady: true,
      isButtonReady: false,
      markGoogleSignInIntent,
    });

    fireEvent.pointerDown(screen.getByTestId('auth-google-outside-card'));

    expect(screen.getByTestId('auth-google-skeleton')).toBeInTheDocument();
    expect(markGoogleSignInIntent).not.toHaveBeenCalled();
  });

  it('marks Google sign-in intent when the rendered button is ready', () => {
    const markGoogleSignInIntent = jest.fn();

    renderOAuthOutsideCard({
      gisReady: true,
      isButtonReady: true,
      markGoogleSignInIntent,
    });

    fireEvent.pointerDown(screen.getByTestId('auth-google-outside-card'));

    expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    expect(markGoogleSignInIntent).toHaveBeenCalledTimes(1);
  });
});
