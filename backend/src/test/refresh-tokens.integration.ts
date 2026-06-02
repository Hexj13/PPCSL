import {
  cookieHeaderFromAuthResponse,
  refreshTokenValueFromSetCookie,
} from './auth-cookie-integration';
import { getTestRequest } from './setup-integration';
import { createTestCredentials } from './test-data-cleanup';

describe('Refresh Tokens Integration', () => {
  let request: ReturnType<typeof getTestRequest>;
  let accessCookie: string;
  let refreshToken: string;
  let userId: string;
  let testEmail: string;
  let testPhone: string;
  let testPassword: string;
  let firstName: string;
  let lastName: string;

  beforeAll(() => {
    request = getTestRequest();
    const credentials = createTestCredentials('refresh-tokens');
    testEmail = credentials.email;
    testPassword = credentials.password;
    testPhone = credentials.phone;
    firstName = credentials.firstName;
    lastName = credentials.lastName;
  });

  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let registerResponse = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: testPhone,
      firstName,
      lastName,
      termsAccepted: true,
      smsVerificationCode: '000000',
    });

    let retries = 0;
    while (
      (registerResponse.status === 429 ||
        (registerResponse.status === 400 &&
          registerResponse.body?.errorKey === 'errors.phoneAlreadyExists')) &&
      retries < 5
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (retries + 1)));
      const retryCredentials = createTestCredentials('refresh-tokens-retry');
      const retryEmail = retries > 0 ? retryCredentials.email : testEmail;
      testPhone = retryCredentials.phone;
      registerResponse = await request.post('/api/auth/register').send({
        email: retryEmail,
        password: testPassword,
        type: 'Individual',
        phone: testPhone,
        firstName,
        lastName,
        termsAccepted: true,
        smsVerificationCode: '000000',
      });
      retries++;
    }

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    if (retries > 0) {
      testEmail = registerResponse.body.email || testEmail;
    }
  });

  describe('POST /api/auth/refresh', () => {
    beforeAll(async () => {
      const loginDto = {
        login: testPhone,
        password: testPassword,
      };

      const response = await request.post('/api/auth/login').send(loginDto).expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).not.toHaveProperty('access_token');

      accessCookie = cookieHeaderFromAuthResponse(response);
      refreshToken = refreshTokenValueFromSetCookie(response);
      userId = response.body.user.id;

      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(100);
      expect(accessCookie).toContain('kupito_access_token=');
    });

    it('should refresh tokens successfully', async () => {
      if (!refreshToken || refreshToken.length === 0) {
        throw new Error(`No refresh token available. refreshToken: ${refreshToken}`);
      }

      const originalRefreshToken = refreshToken;

      const response = await request
        .post('/api/auth/refresh')
        .set('Cookie', accessCookie)
        .send({ refresh_token: originalRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).not.toHaveProperty('access_token');

      const newRefreshToken = refreshTokenValueFromSetCookie(response);

      expect(newRefreshToken).not.toBe(originalRefreshToken);
      expect(newRefreshToken).toBeTruthy();
      expect(response.body.user.id).toBe(userId);

      accessCookie = cookieHeaderFromAuthResponse(response);
      refreshToken = newRefreshToken;
    });

    it('should reject old refresh token after rotation', async () => {
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          login: testPhone,
          password: testPassword,
        })
        .expect(200);

      const cookies = cookieHeaderFromAuthResponse(loginResponse);
      const oldRefreshToken = refreshTokenValueFromSetCookie(loginResponse);

      await request
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .send({ refresh_token: oldRefreshToken })
        .expect(200);

      await request
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .send({ refresh_token: oldRefreshToken })
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token-12345' })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request.post('/api/auth/refresh').send({}).expect(401);
    });
  });

  describe('Token rotation', () => {
    let firstRefreshToken: string;
    let secondRefreshToken: string;

    it('should rotate tokens on each refresh', async () => {
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          login: testPhone,
          password: testPassword,
        })
        .expect(200);

      const loginCookies = cookieHeaderFromAuthResponse(loginResponse);
      firstRefreshToken = refreshTokenValueFromSetCookie(loginResponse);

      const firstRefreshResponse = await request
        .post('/api/auth/refresh')
        .set('Cookie', loginCookies)
        .send({ refresh_token: firstRefreshToken })
        .expect(200);

      secondRefreshToken = refreshTokenValueFromSetCookie(firstRefreshResponse);

      expect(secondRefreshToken).not.toBe(firstRefreshToken);

      const secondCookies = cookieHeaderFromAuthResponse(firstRefreshResponse);

      await request
        .post('/api/auth/refresh')
        .set('Cookie', secondCookies)
        .send({ refresh_token: secondRefreshToken })
        .expect(200);

      await request
        .post('/api/auth/refresh')
        .set('Cookie', loginCookies)
        .send({ refresh_token: firstRefreshToken })
        .expect(401);
    });
  });
});
