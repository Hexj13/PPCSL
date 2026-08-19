/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { HeaderLogo, RESET_SEARCH_EVENT } from './HeaderLogo';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockClearHomeSearchRestoreState = jest.fn();
let mockPathname = '/';

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: mockReplace,
    push: mockPush,
    href: (path: string) => path,
  }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

jest.mock('@/lib/clear-home-search-restore-state', () => ({
  clearHomeSearchRestoreState: () => mockClearHomeSearchRestoreState(),
}));

jest.mock('@/lib/site-config', () => ({
  loadSiteConfigSync: () => ({ assetVersion: '1' }),
}));

jest.mock('@/lib/assets', () => ({
  getVersionedAssetPath: (path: string) => path,
}));

jest.mock('@/lib/utils', () => ({
  getCountry: () => 'md',
}));

const mockScrollTo = jest.fn();

describe('HeaderLogo', () => {
  const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    Object.defineProperty(window, 'scrollTo', {
      value: mockScrollTo,
      writable: true,
      configurable: true,
    });
    dispatchEventSpy.mockClear();
  });

  it('resets search and navigates with push from listing detail', () => {
    mockPathname = '/listings/listing-1';

    render(<HeaderLogo brandAlt="Kupito" />);

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(mockClearHomeSearchRestoreState).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: RESET_SEARCH_EVENT }),
    );
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('resets search and replaces URL when already on home with query params', () => {
    mockPathname = '/';

    render(<HeaderLogo brandAlt="Kupito" />);

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(mockClearHomeSearchRestoreState).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: RESET_SEARCH_EVENT }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/', { scroll: false });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('does not intercept modifier-click navigation', () => {
    mockPathname = '/listings/listing-1';

    render(<HeaderLogo brandAlt="Kupito" />);

    const link = screen.getByRole('link');
    fireEvent.click(link, { metaKey: true });

    expect(mockClearHomeSearchRestoreState).not.toHaveBeenCalled();
    expect(dispatchEventSpy).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('does not intercept non-left-click navigation', () => {
    mockPathname = '/listings/listing-1';

    render(<HeaderLogo brandAlt="Kupito" />);

    const link = screen.getByRole('link');
    fireEvent.click(link, { button: 1 });

    expect(mockClearHomeSearchRestoreState).not.toHaveBeenCalled();
    expect(dispatchEventSpy).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('keeps a logo-sized pulse skeleton until the image loads', () => {
    render(<HeaderLogo brandAlt="Kupito" />);
    expect(screen.getByTestId('header-logo')).toHaveClass('mr-4');
    expect(screen.getAllByTestId('header-logo-image-skeleton').length).toBeGreaterThan(0);
  });

  it('uses the short logo through 1024 desktop and the full wordmark from xl', () => {
    render(<HeaderLogo brandAlt="Kupito" />);
    expect(screen.getByTestId('header-logo-full')).toHaveClass('xl:block');
    expect(screen.getByTestId('header-logo-full')).not.toHaveClass('lg:block');
    expect(screen.getByTestId('header-logo-short')).toHaveClass('xl:hidden');
    expect(screen.getByTestId('header-logo-short')).not.toHaveClass('lg:hidden');
  });
});
