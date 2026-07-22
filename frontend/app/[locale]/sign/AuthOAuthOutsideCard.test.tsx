import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { AuthOAuthOutsideCard } from './AuthOAuthOutsideCard';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/app/[locale]/sign/AuthOAuthConsent', () => ({
  AuthOAuthConsent: () => <div data-testid="auth-oauth-consent" />,
}));

jest.mock('@/app/[locale]/sign/GoogleSignInButton', () => ({
  GoogleSignInButton: ({
    containerRef,
  }: {
    containerRef: React.RefObject<HTMLDivElement | null>;
  }) => (
    <div data-testid="mock-google-button">
      <div ref={containerRef} />
    </div>
  ),
}));

jest.mock('@/app/[locale]/sign/TelegramSignInButton', () => ({
  TelegramSignInButton: () => <button type="button">Telegram</button>,
}));

function renderOAuthOutsideCard({
  isButtonReady,
  isButtonRenderTimedOut = false,
}: {
  isButtonReady: boolean;
  isButtonRenderTimedOut?: boolean;
}) {
  render(
    <AuthOAuthOutsideCard
      googleClientIdConfigured={true}
      telegramClientIdConfigured={false}
      googleAuth={{
        isButtonReady,
        isButtonRenderTimedOut,
        containerRef: createRef<HTMLDivElement>(),
        clientIdConfigured: true,
        isGoogleBusy: false,
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
  it('shows the Google skeleton while the button is still loading', () => {
    renderOAuthOutsideCard({
      isButtonReady: false,
    });

    fireEvent.pointerDown(screen.getByTestId('auth-google-outside-card'));

    expect(screen.getByTestId('auth-google-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('mock-google-button')).toBeInTheDocument();
    expect(screen.getByTestId('auth-google-outside-card')).toHaveClass(
      'h-10',
      'w-10',
      'shrink-0',
      'overflow-hidden',
    );
  });

  it('removes the blocking skeleton after GIS render timeout', () => {
    renderOAuthOutsideCard({
      isButtonReady: false,
      isButtonRenderTimedOut: true,
    });

    expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-google-button')).toBeInTheDocument();
  });

  it('shows the Google button shell when GIS markup is ready', () => {
    renderOAuthOutsideCard({
      isButtonReady: true,
    });

    expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-google-button')).toBeInTheDocument();
  });
});
