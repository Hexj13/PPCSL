import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { GoogleSignInButton } from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('makes the GIS subtree inert while sign-in is disabled', () => {
    render(
      <GoogleSignInButton containerRef={createRef<HTMLDivElement>()} clientIdConfigured disabled />,
    );

    const gisContainer = screen.getByTestId('auth-google-gis-container');

    expect(gisContainer).toHaveAttribute('inert');
    expect(gisContainer).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the GIS subtree interactive when sign-in is available', () => {
    render(<GoogleSignInButton containerRef={createRef<HTMLDivElement>()} clientIdConfigured />);

    const gisContainer = screen.getByTestId('auth-google-gis-container');

    expect(gisContainer).not.toHaveAttribute('inert');
    expect(gisContainer).toHaveAttribute('aria-hidden', 'false');
    expect(gisContainer).toHaveClass('absolute', 'inset-0', 'h-10', 'w-10', 'overflow-hidden');
  });
});
