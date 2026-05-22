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

describe('HeaderLogo', () => {
  const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    scrollToSpy.mockClear();
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
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
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
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
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
    expect(scrollToSpy).not.toHaveBeenCalled();
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
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
