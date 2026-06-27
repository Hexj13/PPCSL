import { act, fireEvent, render, waitFor, within } from '@testing-library/react';

import { resetOverlayHistoryForTests, triggerOverlayPopStateForTests } from '@/lib/overlay-history';

import { BottomSheet } from './BottomSheet';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.close' ? 'Close' : key),
  }),
}));

const screen = within(document.documentElement);

function mockMobileViewport() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: typeof query === 'string' && query.includes('max-width') && query.includes('767'),
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
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.scrollTo = jest.fn();
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
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    delete document.body.dataset.bottomSheetScrollLock;
  });

  afterEach(() => {
    resetOverlayHistoryForTests();
    jest.useRealTimers();
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    delete document.body.dataset.bottomSheetScrollLock;
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
    fireEvent.click(screen.getByTestId('bottom-sheet-close'));
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
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

  it('locks body scroll while open and restores scrollY on close', async () => {
    jest.useFakeTimers();
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 240,
    });

    const onClose = jest.fn();
    const { rerender } = render(
      <BottomSheet isOpen onClose={onClose} title="Scroll lock sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    await waitFor(() => {
      expect(document.body.dataset.bottomSheetScrollLock).toBe('true');
    });
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-240px');

    rerender(
      <BottomSheet isOpen={false} onClose={onClose} title="Scroll lock sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(document.body.dataset.bottomSheetScrollLock).toBeUndefined();
    expect(document.body.style.position).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it('renders the portal outside the locked body', async () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Portal sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    await waitFor(() => {
      expect(document.body.dataset.bottomSheetScrollLock).toBe('true');
    });

    const overlay = screen.getByTestId('bottom-sheet-overlay');
    const portalRoot = screen.getByTestId('bottom-sheet-portal-root');
    expect(portalRoot).toBeInstanceOf(HTMLElement);
    expect(document.documentElement).toContainElement(portalRoot);
    expect(document.body).not.toContainElement(portalRoot);
    expect(portalRoot).toContainElement(overlay);
  });

  it('caps the locked sheet above the keyboard while preserving its target height', async () => {
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
    const panelAnchor = screen.getByTestId('bottom-sheet-panel-anchor');
    const searchInput = screen.getByLabelText('Search city');

    searchInput.focus();
    expect(searchInput).toHaveFocus();
    expect(dialog).toHaveStyle({ height: '736px', maxHeight: '736px', minHeight: '704px' });
    expect(overlay).toHaveClass('fixed', 'inset-0');
    expect(panelAnchor).toHaveStyle({ bottom: '0px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 420,
    });
    fireEvent.resize(window);

    await waitFor(() => {
      expect(dialog).toHaveStyle({ height: '736px', maxHeight: '386px' });
      expect(panelAnchor).toHaveStyle({ bottom: '380px' });
    });
    expect(dialog).not.toHaveStyle({ minHeight: '704px' });
    expect(overlay).toHaveClass('fixed', 'inset-0');
    expect(screen.queryByTestId('bottom-sheet-keyboard-spacer')).not.toBeInTheDocument();
    expect(dialog).toContainElement(searchInput);
    expect(searchInput).toHaveFocus();
  });

  it('lifts the unlocked sheet above the keyboard using bottom inset', async () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Input sheet">
        <input aria-label="Mileage from" inputMode="numeric" type="text" />
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    const overlay = screen.getByTestId('bottom-sheet-overlay');
    const panelAnchor = screen.getByTestId('bottom-sheet-panel-anchor');

    expect(dialog).toHaveStyle({ maxHeight: '736px' });
    expect(dialog).not.toHaveStyle({ height: '736px' });
    expect(dialog).not.toHaveStyle({ minHeight: '704px' });
    expect(overlay).toHaveClass('fixed', 'inset-0');

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

    await waitFor(() => {
      expect(overlay).toHaveClass('fixed', 'inset-0');
      expect(panelAnchor).toHaveStyle({ bottom: '200px' });
      expect(dialog).toHaveStyle({ maxHeight: '386px' });
    });
    expect(screen.queryByTestId('bottom-sheet-keyboard-spacer')).not.toBeInTheDocument();
    expect(dialog).not.toHaveStyle({ height: '386px' });
  });

  it('keeps the sheet anchored to the bottom when the layout viewport exceeds the visual viewport without a keyboard', () => {
    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 650,
    });
    Object.defineProperty(window.visualViewport, 'offsetTop', {
      configurable: true,
      value: 0,
    });

    render(
      <BottomSheet isOpen onClose={() => {}} title="Anchored sheet">
        <input aria-label="Mileage from" inputMode="numeric" type="text" />
      </BottomSheet>,
    );

    const panelAnchor = screen.getByTestId('bottom-sheet-panel-anchor');
    expect(panelAnchor).toHaveStyle({ bottom: '0px' });
    expect(screen.queryByTestId('bottom-sheet-keyboard-spacer')).not.toBeInTheDocument();
  });

  it('raises the unlocked sheet when the visual viewport shrinks', async () => {
    render(
      <BottomSheet isOpen onClose={() => {}} title="Adaptive sheet">
        <p>Content</p>
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    const panelAnchor = screen.getByTestId('bottom-sheet-panel-anchor');
    expect(dialog).toHaveStyle({ maxHeight: '736px' });
    expect(dialog).not.toHaveStyle({ height: '736px' });
    expect(dialog).not.toHaveStyle({ minHeight: '704px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    fireEvent.resize(window);

    await waitFor(() => {
      expect(panelAnchor).toHaveStyle({ bottom: '380px' });
      expect(dialog).toHaveStyle({ maxHeight: '386px' });
    });
    expect(screen.queryByTestId('bottom-sheet-keyboard-spacer')).not.toBeInTheDocument();
    expect(dialog).not.toHaveStyle({ minHeight: '370px' });
  });

  it('keeps the unlocked sheet stable during a transient keyboard-close viewport frame', async () => {
    jest.useFakeTimers();
    render(
      <BottomSheet isOpen onClose={() => {}} title="Mileage sheet">
        <input aria-label="Mileage from" inputMode="numeric" type="text" />
        <input aria-label="Mileage to" inputMode="numeric" type="text" />
      </BottomSheet>,
    );

    const dialog = screen.getByRole('dialog');
    const panelAnchor = screen.getByTestId('bottom-sheet-panel-anchor');

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    fireEvent.resize(window);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    await waitFor(() => {
      expect(panelAnchor).toHaveStyle({ bottom: '380px' });
      expect(dialog).toHaveStyle({ maxHeight: '386px' });
    });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 800,
    });
    fireEvent.resize(window);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(panelAnchor).toHaveStyle({ bottom: '380px' });
    expect(dialog).toHaveStyle({ maxHeight: '386px' });

    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 420,
    });
    fireEvent.resize(window);

    act(() => {
      jest.advanceTimersByTime(160);
    });

    expect(panelAnchor).toHaveStyle({ bottom: '380px' });
    expect(dialog).toHaveStyle({ maxHeight: '386px' });
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
    expect(document.body.dataset.bottomSheetScrollLock).toBeUndefined();
  });
});
