import { act, fireEvent, render, screen } from '@testing-library/react';

import { resetOverlayHistoryForTests, triggerOverlayPopStateForTests } from '@/lib/overlay-history';

import { BottomSheet } from './BottomSheet';

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

jest.mock('@/hooks/useScrollLock', () => ({
  useScrollLock: jest.fn(),
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
    const pushState = jest.fn((state: Record<string, unknown>) => {
      window.history.state = state;
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { state: null, pushState, back: jest.fn() },
    });
  });

  afterEach(() => {
    resetOverlayHistoryForTests();
  });

  it('renders title and calls onClose when close is triggered', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Test sheet">
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Test sheet')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
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

    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('returns null when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}} title="Hidden">
        <p>X</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('does not render on wide viewport even when isOpen', () => {
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
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });
});
