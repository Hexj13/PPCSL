/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ListingPageDescription } from './ListingPageDescription';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ListingPageDescription', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 800;
      },
    });
  });

  it('shows expand toggle for tall content and toggles aria-expanded', async () => {
    render(<ListingPageDescription rawHtml="<p>Long description content</p>" />);

    const toggle = await screen.findByTestId('listing-description-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
