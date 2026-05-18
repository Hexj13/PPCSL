import { authApi } from './api-auth';
import { api } from './api-client';
import type { User } from './api-types';

describe('authApi meQuiet', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends skip headers including X-Skip-Auth-Refresh', async () => {
    const minimalUser: User = { id: '1', email: null, type: 'Individual' };
    const spy = jest.spyOn(api, 'get').mockResolvedValue({ data: minimalUser });
    await authApi.meQuiet();
    expect(spy).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Skip-Auth-Refresh': 'true',
          'X-Skip-Auth-Redirect': 'true',
          'X-Skip-Error-Handling': 'true',
        }),
      }),
    );
  });
});
