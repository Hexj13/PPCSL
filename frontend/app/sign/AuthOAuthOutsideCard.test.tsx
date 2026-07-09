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
  isButtonRenderTimedOut = false,
  markGoogleSignInIntent = jest.fn(),
}: {
  gisReady: boolean;
  isButtonReady: boolean;
  isButtonRenderTimedOut?: boolean;
  markGoogleSignInIntent?: jest.Mock;
}) {
  render(
    <AuthOAuthOutsideCard
      googleClientIdConfigured={true}
      telegramClientIdConfigured={false}
      gisReady={gisReady}
      googleAuth={{
        isButtonReady,
        isButtonRenderTimedOut,
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

  it('removes the blocking skeleton after GIS render timeout', () => {
    const markGoogleSignInIntent = jest.fn();

    renderOAuthOutsideCard({
      gisReady: true,
      isButtonReady: false,
      isButtonRenderTimedOut: true,
      markGoogleSignInIntent,
    });

    expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-google-button')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId('auth-google-outside-card'));
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
