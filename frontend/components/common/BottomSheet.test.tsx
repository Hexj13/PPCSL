import { act, fireEvent, render, screen } from '@testing-library/react';

import { COMPACT_LAYOUT_MAX_WIDTH_PX } from '@/lib/layout-breakpoints';
import { resetOverlayHistoryForTests, triggerOverlayPopStateForTests } from '@/lib/overlay-history';

import { BottomSheet } from './BottomSheet';

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.close' ? 'Close' : key),
  }),
}));

function mockMobileViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches:
        typeof query === 'string' &&
        query.includes('max-width') &&
        query.includes(String(COMPACT_LAYOUT_MAX_WIDTH_PX)),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('BottomSheet', () => {
  beforeEach(() => {
    resetOverlayHistoryForTests();
    mockMobileViewport();
    let historyState: Record<string, unknown> | null = null;
    const pushState = jest.fn((state: Record<string, unknown>) => {
      historyState = state;
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        get state() {
          return historyState;
        },
        pushState,
        back: jest.fn(),
      },
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: {
        height: 800,
        offsetLeft: 0,
        offsetTop: 0,
        width: 390,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });
  });

  afterEach(() => {
    resetOverlayHistoryForTests();
    jest.useRealTimers();
  });

  it('renders title and calls onClose after close button exit animation', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Test sheet')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-sheet-overlay')).toHaveAttribute('data-bottom-sheet-overlay');
    fireEvent.click(screen.getByTestId('bottom-sheet-close'));
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a title icon next to the sheet heading', () => {
    render(
      <BottomSheet
        isOpen
        onClose={jest.fn()}
        title="Sort"
        titleIcon={<svg data-testid="sort-title-icon" />}
      >
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('heading', { name: 'Sort' })).toContainElement(
      screen.getByTestId('sort-title-icon'),
    );
  });

  it('closes when the user navigates back in history', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    act(() => {
      triggerOverlayPopStateForTests();
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when parent sets isOpen to false after confirm', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    const { rerender } = render(
      <BottomSheet isOpen onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Test sheet')).toBeInTheDocument();

    rerender(
      <BottomSheet isOpen={false} onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Test sheet')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-sheet-overlay')).toHaveClass('pointer-events-auto');

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Test sheet')).not.toBeInTheDocument();
  });

  it('closes on Escape after exit animation', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies dynamic max height from visual viewport when lockSheetHeight is enabled', () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Tall sheet" lockSheetHeight>
        <p>Content</p>
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
  });

  it('keeps locked height stable when visual viewport shrinks after search focus', () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Search sheet" lockSheetHeight>
        <div className="flex min-h-0 flex-1 flex-col">
          <div>
            <input aria-label="Search city" type="search" />
          </div>
          <div data-bottom-sheet-scrollable="true">Results</div>
        </div>
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    const overlay = screen.getByTestId('bottom-sheet-overlay');
    const searchInput = screen.getByLabelText('Search city');

    searchInput.focus();
    expect(searchInput).toHaveFocus();
    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
    expect(overlay).toHaveStyle({ height: '800px', top: '0px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    fireEvent.resize(window);

    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
    expect(overlay).toHaveStyle({ height: '800px', top: '0px' });
    expect(dialog).toContainElement(searchInput);
    expect(searchInput).toHaveFocus();
  });

  it('positions unlocked overlay within the visual viewport when the keyboard shifts it', () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Input sheet">
        <input aria-label="Mileage from" inputMode="numeric" type="text" />
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    const overlay = screen.getByTestId('bottom-sheet-overlay');

    expect(dialog).toHaveStyle({ maxHeight: '736px' });
    expect(dialog).not.toHaveStyle({ height: '736px' });
    expect(dialog).not.toHaveStyle({ minHeight: '704px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    Object.defineProperty(window.visualViewport, 'offsetLeft', {
      configurable: true,
      value: 6,
    });
    Object.defineProperty(window.visualViewport, 'offsetTop', {
      configurable: true,
      value: 180,
    });
    Object.defineProperty(window.visualViewport, 'width', {
      configurable: true,
      value: 378,
    });
    fireEvent.resize(window);

    expect(overlay).toHaveStyle({
      height: '420px',
      left: '6px',
      top: '180px',
      width: '378px',
    });
    expect(dialog).toHaveStyle({ maxHeight: '386px' });
    expect(dialog).not.toHaveStyle({ height: '386px' });
  });

  it('updates unlocked height when visual viewport changes', () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Adaptive sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ maxHeight: '736px' });
    expect(dialog).not.toHaveStyle({ height: '736px' });
    expect(dialog).not.toHaveStyle({ minHeight: '704px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    fireEvent.resize(window);

    expect(dialog).toHaveStyle({ maxHeight: '386px' });
    expect(dialog).not.toHaveStyle({ minHeight: '370px' });
  });

  it('returns null when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}} title="Hidden">
        <p>X</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('does not render on wide viewport when mobileOnly is true', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Desktop">
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Desktop')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders on wide viewport when mobileOnly is false', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    render(
      <BottomSheet isOpen onClose={() => {}} title="Desktop sheet" mobileOnly={false}>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Desktop sheet')).toBeInTheDocument();
  });

  it('replaces the default title row when a custom header is provided', () => {
    render(
      <BottomSheet
        isOpen
        onClose={() => {}}
        title="Accessible title"
        header={<div data-testid="custom-sheet-header">Custom chrome</div>}
      >
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.queryByTestId('bottom-sheet-close')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-sheet-header')).toBeInTheDocument();
    expect(screen.getByText('Accessible title')).toHaveClass('sr-only');
  });

  it('mounts content on the same update when opening', () => {
    const { rerender } = render(
      <BottomSheet isOpen={false} onClose={() => {}} title="Sync sheet">
        <p>Sheet body</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Sheet body')).not.toBeInTheDocument();

    rerender(
      <BottomSheet isOpen onClose={() => {}} title="Sync sheet">
        <p>Sheet body</p>
      </BottomSheet>,
    );

    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-sheet-slide')).toHaveStyle({ transform: 'translateY(100%)' });
  });
});
