type MockApiInstance = jest.Mock & {
  post: jest.Mock;
  request: jest.Mock;
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};

const makeMockApiInstance = (): MockApiInstance => {
  const instance = jest.fn() as unknown as MockApiInstance;
  instance.post = jest.fn();
  instance.request = jest.fn();
  instance.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return instance;
};

let mockApiInstance: MockApiInstance;
let apiClientModule: { refreshAuthSession: () => Promise<unknown> };
let localStorageGetItemMock: jest.Mock;

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn(() => mockApiInstance),
  };
});

jest.mock('../browser-local-storage', () => ({
  localStorageGetItem: (...args: unknown[]) => localStorageGetItemMock(...args),
  localStorageSetItem: jest.fn(),
}));

jest.mock('../client-auth-storage', () => ({
  clearClientAuthLocalStorage: jest.fn(),
}));

jest.mock('../i18n', () => ({
  getDefaultLocale: jest.fn(() => 'ro'),
  loadTranslations: jest.fn(() => ({
    common: {
      apiErrors: {
        unauthorized: 'Unauthorized',
        tooManyRequests: 'Too many requests',
        timeout: 'Timeout',
        networkError: 'Network',
        connectionError: 'Connection',
        badRequest: 'Bad request',
        forbidden: 'Forbidden',
        notFound: 'Not found',
        conflict: 'Conflict',
        validationError: 'Validation',
        serverError: 'Server',
        serviceUnavailable: 'Service unavailable',
        unknownError: 'Unknown {status}',
      },
    },
  })),
}));

describe('api-client auth refresh guards', () => {
  const flushMicrotasks = async (times = 4) => {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve();
    }
  };

  const getResponseRejectedHandler = () => {
    const responseUseCalls = mockApiInstance.interceptors.response.use.mock.calls;
    const lastCall = responseUseCalls[responseUseCalls.length - 1];
    return lastCall[1] as (error: unknown) => Promise<unknown>;
  };

  beforeEach(() => {
    jest.resetModules();
    mockApiInstance = makeMockApiInstance();
    localStorageGetItemMock = jest.fn((key: string) => {
      if (key === 'refresh_token') return 'refresh-token';
      if (key === 'token') return 'token';
      if (key === 'kupito-locale') return 'ro';
      return null;
    });
    jest.clearAllMocks();
    jest.isolateModules(() => {
      apiClientModule = require('./api-client') as { refreshAuthSession: () => Promise<unknown> };
    });
  });

  it('marks queued requests as already refresh-attempted', async () => {
    const onRejected = getResponseRejectedHandler();
    const pendingRefresh = new Promise(() => {});
    mockApiInstance.post.mockReturnValue(pendingRefresh);

    const firstRequest = {
      headers: {},
      url: '/api/listings',
      method: 'get',
    };
    const firstError = {
      response: { status: 401, headers: {}, data: {} },
      config: firstRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Unauthorized',
    };

    void onRejected(firstError);
    await flushMicrotasks();

    const queuedRequest = {
      headers: {},
      url: '/api/profile',
      method: 'get',
    };
    const queuedError = {
      response: { status: 401, headers: {}, data: {} },
      config: queuedRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Unauthorized',
    };

    void onRejected(queuedError);

    await flushMicrotasks();

    expect(queuedRequest).toMatchObject({
      _authRetry: true,
      _refreshAttempts: 1,
    });
  });

  it('does not start refresh when request has X-Skip-Auth-Redirect', async () => {
    const onRejected = getResponseRejectedHandler();

    const quietRequest = {
      headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
      url: '/api/auth/me',
      method: 'get',
    };
    const quietError = {
      response: { status: 401, headers: {}, data: {} },
      config: quietRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Unauthorized',
    };

    await expect(onRejected(quietError)).rejects.toEqual(quietError);
    expect(mockApiInstance.post).not.toHaveBeenCalled();
  });

  it('does not start refresh when request has X-Skip-Auth-Refresh', async () => {
    const onRejected = getResponseRejectedHandler();

    const quietRequest = {
      headers: { 'X-Skip-Auth-Refresh': 'true', 'X-Skip-Error-Handling': 'true' },
      url: '/api/listings',
      method: 'get',
    };
    const quietError = {
      response: { status: 401, headers: {}, data: {} },
      config: quietRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Unauthorized',
    };

    await expect(onRejected(quietError)).rejects.toEqual(quietError);
    expect(mockApiInstance.post).not.toHaveBeenCalled();
  });

  it('does not retry rate-limited refresh requests', async () => {
    const onRejected = getResponseRejectedHandler();

    const refreshRequest = {
      headers: { 'X-Skip-Error-Handling': 'true' },
      url: '/api/auth/refresh',
      method: 'post',
    };
    const refreshError = {
      response: { status: 429, headers: {}, data: {} },
      config: refreshRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Too many requests',
    };

    await expect(onRejected(refreshError)).rejects.toEqual(refreshError);
    expect(mockApiInstance).not.toHaveBeenCalled();
    expect(mockApiInstance.request).not.toHaveBeenCalled();
  });

  it('deduplicates direct refresh session calls', async () => {
    mockApiInstance.post.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await Promise.all([apiClientModule.refreshAuthSession(), apiClientModule.refreshAuthSession()]);

    expect(mockApiInstance.post).toHaveBeenCalledTimes(1);
    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      {
        headers: {
          'X-Skip-Auth-Refresh': 'true',
          'X-Skip-Error-Handling': 'true',
        },
      },
    );
  });

  it('does not start refresh when request reached refresh attempts limit', async () => {
    const onRejected = getResponseRejectedHandler();

    const exhaustedRequest = {
      headers: { 'X-Skip-Error-Handling': 'true' },
      url: '/api/listings',
      method: 'get',
      _refreshAttempts: 1,
      _authRetry: true,
    };
    const exhaustedError = {
      response: { status: 401, headers: {}, data: {} },
      config: exhaustedRequest,
      code: 'ERR_BAD_REQUEST',
      name: 'AxiosError',
      message: 'Unauthorized',
    };

    await expect(onRejected(exhaustedError)).rejects.toEqual(exhaustedError);
    expect(mockApiInstance.post).not.toHaveBeenCalled();
  });
});
