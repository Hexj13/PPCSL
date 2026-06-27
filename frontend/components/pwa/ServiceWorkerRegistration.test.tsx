import { fireEvent, render, waitFor, within } from '@testing-library/react';
import React from 'react';

import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    isLoading: false,
    translations: {},
  }),
}));

const screen = within(document.documentElement);

describe('ServiceWorkerRegistration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let controllerChangeHandler: (() => void) | null = null;
  const mockUnregister = jest.fn().mockResolvedValue(undefined);
  const mockRegister = jest.fn();
  const mockGetRegistrations = jest.fn();
  const mockPostMessage = jest.fn();

  const mockWaitingWorker = {
    postMessage: mockPostMessage,
    state: 'installed',
    addEventListener: jest.fn(),
  };

  const setupNavigatorServiceWorker = (options: {
    registerImpl?: () => Promise<unknown>;
    controller?: object | null;
  }) => {
    const { registerImpl, controller = {} } = options;
    mockRegister.mockImplementation(
      registerImpl ??
        (() =>
          Promise.resolve({
            waiting: mockWaitingWorker,
            installing: null,
            addEventListener: jest.fn(),
          })),
    );

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        addEventListener: jest.fn((event: string, handler: () => void) => {
          if (event === 'controllerchange') {
            controllerChangeHandler = handler;
          }
        }),
        removeEventListener: jest.fn(),
        register: mockRegister,
        getRegistrations: mockGetRegistrations,
        controller,
      },
    });
  };

  beforeEach(() => {
    controllerChangeHandler = null;
    jest.clearAllMocks();
    mockGetRegistrations.mockResolvedValue([{ unregister: mockUnregister }]);
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    }
    controllerChangeHandler = null;
    jest.restoreAllMocks();
  });

  it('should unregister all service workers when not in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true,
    });
    setupNavigatorServiceWorker({ controller: null });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(mockGetRegistrations).toHaveBeenCalled());
    expect(mockUnregister).toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should register service worker in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });
    setupNavigatorServiceWorker({
      controller: {},
      registerImpl: () =>
        Promise.resolve({
          waiting: null,
          installing: null,
          addEventListener: jest.fn(),
        }),
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' }));
  });

  it('should not reload on controllerchange until user confirms update', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });
    const reload = jest.fn();
    const oldLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...oldLocation, reload },
    });

    setupNavigatorServiceWorker({ controller: {} });

    try {
      render(<ServiceWorkerRegistration />);

      await waitFor(() => expect(mockRegister).toHaveBeenCalled());

      expect(controllerChangeHandler).not.toBeNull();
      controllerChangeHandler?.();
      expect(reload).not.toHaveBeenCalled();

      await screen.findByText('pwa.updateAvailable');
      fireEvent.click(screen.getByText('pwa.updateNow'));

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

      controllerChangeHandler?.();
      expect(reload).toHaveBeenCalledTimes(1);

      controllerChangeHandler?.();
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: oldLocation,
      });
    }
  });
});
