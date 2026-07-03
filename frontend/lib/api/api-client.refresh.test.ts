const postMock = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    create: jest.fn(() => ({
      post: (...args: unknown[]) => postMock(...args),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  };
});

describe('refreshAuthSession', () => {
  beforeEach(() => {
    jest.resetModules();
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: { user: { id: 'user-1' }, access_token: 'access', refresh_token: 'refresh' },
    });
  });

  it('deduplicates parallel refresh calls into one HTTP request', async () => {
    const { refreshAuthSession } = await import('./api-client');

    const first = refreshAuthSession();
    const second = refreshAuthSession();

    await Promise.all([first, second]);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Skip-Auth-Refresh': 'true',
          'X-Skip-Error-Handling': 'true',
        }),
      }),
    );
  });

  it('uses navigator.locks when available', async () => {
    const requestMock = jest.fn((_name: string, fn: () => Promise<unknown>) => fn());
    Object.defineProperty(global.navigator, 'locks', {
      configurable: true,
      value: { request: requestMock },
    });

    const { refreshAuthSession } = await import('./api-client');
    await refreshAuthSession();

    expect(requestMock).toHaveBeenCalledWith('kupito-auth-refresh', expect.any(Function));
  });
});
