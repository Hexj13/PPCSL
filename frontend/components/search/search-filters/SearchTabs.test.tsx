import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { getTabCenteredBetweenControlsScrollLeft, SearchTabs } from './SearchTabs';

const searchTabsTranslations: Record<string, string> = {
  'searchFilters.popularFilters': 'Popular Models',
  'searchFilters.basicCriteria': 'Basic Criteria',
  'searchFilters.additionalCriteria': 'Additional Criteria',
  'searchFilters.equipment': 'Equipment',
  'searchFilters.showNextTabs': 'Show next tabs',
  'searchFilters.showPreviousTabs': 'Show previous tabs',
};

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => searchTabsTranslations[key] ?? key,
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    searchTabSelect: jest.fn(),
  },
}));

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

let resizeObserverCallback: ResizeObserverCallback | null = null;

class MockResizeObserver {
  observe = jest.fn();

  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }
}

function triggerResizeObserver() {
  act(() => {
    resizeObserverCallback?.([], {} as ResizeObserver);
  });
}

function createDefaultProps() {
  return {
    activeTab: 'basic' as const,
    onTabChange: jest.fn(),
    hasBasicFilters: false,
    hasAdvancedFiltersActive: false,
    hasEquipmentFiltersActive: false,
    hasPopularFiltersActive: false,
    basicTabRef: createRef<HTMLButtonElement>(),
    advancedTabRef: createRef<HTMLButtonElement>(),
    equipmentTabRef: createRef<HTMLButtonElement>(),
    popularTabRef: createRef<HTMLButtonElement>(),
    indicatorRef: createRef<HTMLDivElement>(),
    indicatorStyle: { left: 0, width: 120 },
    tabsContainerRef: createRef<HTMLDivElement>(),
    switchingLocked: false,
  };
}

describe('getTabCenteredBetweenControlsScrollLeft', () => {
  it('centers tab between left and right control zones', () => {
    const container = {
      clientWidth: 300,
      scrollWidth: 600,
    } as HTMLElement;
    const tab = {
      offsetLeft: 124,
      offsetWidth: 160,
    } as HTMLElement;

    expect(getTabCenteredBetweenControlsScrollLeft(container, tab)).toBe(54);
  });

  it('clamps to the start when the tab cannot be centered', () => {
    const container = {
      clientWidth: 300,
      scrollWidth: 600,
    } as HTMLElement;
    const tab = {
      offsetLeft: 0,
      offsetWidth: 120,
    } as HTMLElement;

    expect(getTabCenteredBetweenControlsScrollLeft(container, tab)).toBe(0);
  });

  it('clamps to the end when the tab cannot be centered', () => {
    const container = {
      clientWidth: 300,
      scrollWidth: 600,
    } as HTMLElement;
    const tab = {
      offsetLeft: 480,
      offsetWidth: 120,
    } as HTMLElement;

    expect(getTabCenteredBetweenControlsScrollLeft(container, tab)).toBe(300);
  });
});

describe('SearchTabs scroll affordance', () => {
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    resizeObserverCallback = null;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  function renderVehicleTabs(containerMetrics?: {
    clientWidth: number;
    scrollWidth: number;
    scrollLeft: number;
  }) {
    const props = createDefaultProps();
    const { rerender, ...view } = render(<SearchTabs {...props} variant="vehicle" />);
    const container = screen.getByTestId('search-tabs-scroll-container');

    props.tabsContainerRef.current = container;

    if (containerMetrics) {
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: containerMetrics.clientWidth,
      });
      Object.defineProperty(container, 'scrollWidth', {
        configurable: true,
        value: containerMetrics.scrollWidth,
      });
      Object.defineProperty(container, 'scrollLeft', {
        configurable: true,
        writable: true,
        value: containerMetrics.scrollLeft,
      });
      container.scrollTo = jest.fn(({ left }: { left: number }) => {
        Object.defineProperty(container, 'scrollLeft', {
          configurable: true,
          writable: true,
          value: left,
        });
        container.dispatchEvent(new Event('scroll'));
      });
    }

    rerender(<SearchTabs {...props} variant="vehicle" />);
    triggerResizeObserver();

    return { ...view, scrollContainer: container, props, rerender };
  }

  function mockTabGeometry(
    tabs: HTMLElement[],
    tabRects: Array<{ width: number; offsetLeft: number }>,
  ) {
    tabs.forEach((tab, index) => {
      const rect = tabRects[index];
      Object.defineProperty(tab, 'offsetLeft', {
        configurable: true,
        value: rect.offsetLeft,
      });
      Object.defineProperty(tab, 'offsetWidth', {
        configurable: true,
        value: rect.width,
      });
    });
  }

  it('centers the basic tab on initial render when tabs overflow', () => {
    const props = createDefaultProps();
    render(<SearchTabs {...props} variant="vehicle" />);
    const scrollContainer = screen.getByTestId('search-tabs-scroll-container');
    props.tabsContainerRef.current = scrollContainer;

    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(scrollContainer, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0,
    });
    scrollContainer.scrollTo = jest.fn();
    mockTabGeometry([screen.getByTestId('search-tab-basic')], [{ width: 160, offsetLeft: 124 }]);

    act(() => {
      triggerResizeObserver();
    });

    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      left: 54,
      behavior: 'instant',
    });
  });

  it('shows the right scroll control when tabs overflow at the start', () => {
    renderVehicleTabs({ clientWidth: 300, scrollWidth: 600, scrollLeft: 0 });

    expect(screen.getByRole('button', { name: 'Show next tabs' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show previous tabs' })).not.toBeInTheDocument();
  });

  it('hides scroll controls when tabs fit without overflow', () => {
    renderVehicleTabs({ clientWidth: 600, scrollWidth: 600, scrollLeft: 0 });

    expect(screen.queryByRole('button', { name: 'Show next tabs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show previous tabs' })).not.toBeInTheDocument();
  });

  it('shows the left scroll control after scrolling away from the start', () => {
    renderVehicleTabs({ clientWidth: 300, scrollWidth: 600, scrollLeft: 120 });
    const scrollContainer = screen.getByTestId('search-tabs-scroll-container');

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 120,
    });
    fireEvent.scroll(scrollContainer);

    expect(screen.getByRole('button', { name: 'Show previous tabs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show next tabs' })).toBeInTheDocument();
  });

  it('scrolls to the next hidden tab when the right control is clicked', () => {
    const { scrollContainer } = renderVehicleTabs({
      clientWidth: 300,
      scrollWidth: 600,
      scrollLeft: 0,
    });

    const tabs = [
      screen.getByTestId('search-tab-popular'),
      screen.getByTestId('search-tab-basic'),
      screen.getByTestId('search-tab-advanced'),
      screen.getByTestId('search-tab-equipment'),
    ];

    mockTabGeometry(tabs, [
      { width: 120, offsetLeft: 0 },
      { width: 120, offsetLeft: 124 },
      { width: 120, offsetLeft: 248 },
      { width: 120, offsetLeft: 372 },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Show next tabs' }));

    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      left: 184,
      behavior: 'smooth',
    });
  });

  it('scrolls to the previous hidden tab when the left control is clicked', () => {
    const { scrollContainer } = renderVehicleTabs({
      clientWidth: 300,
      scrollWidth: 600,
      scrollLeft: 200,
    });

    const tabs = [
      screen.getByTestId('search-tab-popular'),
      screen.getByTestId('search-tab-basic'),
      screen.getByTestId('search-tab-advanced'),
      screen.getByTestId('search-tab-equipment'),
    ];

    mockTabGeometry(tabs, [
      { width: 120, offsetLeft: 0 },
      { width: 120, offsetLeft: 124 },
      { width: 120, offsetLeft: 248 },
      { width: 120, offsetLeft: 372 },
    ]);

    fireEvent.scroll(screen.getByTestId('search-tabs-scroll-container'));

    fireEvent.click(screen.getByRole('button', { name: 'Show previous tabs' }));

    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      left: 60,
      behavior: 'smooth',
    });
  });
});
