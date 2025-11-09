import request from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Refresh Tokens Integration', () => {
  let request: request.SuperTest<request.Test>;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let testEmail: string;
  let testPassword: string;

  beforeAll(() => {
    request = getTestRequest();
    testEmail = `test${Date.now()}@example.com`;
    testPassword = 'Test123!@#';
  });

  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let registerResponse = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+389701234${Math.floor(Math.random() * 10000)}`,
      firstName: 'Test',
      lastName: 'User',
      termsAccepted: true,
    });

    let retries = 0;
    while (registerResponse.status === 429 && retries < 3) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (retries + 1)));
      registerResponse = await request.post('/api/auth/register').send({
        email: `test${Date.now() + retries}@example.com`,
        password: testPassword,
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
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
        login: testEmail,
        password: testPassword,
      };

      const response = await request.post('/api/auth/login').send(loginDto).expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');

      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
      userId = response.body.user.id;

      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(100);
    });

    it('should refresh tokens successfully', async () => {
      if (!refreshToken || refreshToken.length === 0) {
        throw new Error(`No refresh token available. refreshToken: ${refreshToken}`);
      }

      const originalRefreshToken = refreshToken;

      const response = await request
        .post('/api/auth/refresh')
        .send({ refresh_token: originalRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');

      const newAccessToken = response.body.access_token;
      const newRefreshToken = response.body.refresh_token;

      expect(newRefreshToken).not.toBe(originalRefreshToken);
      expect(newRefreshToken).toBeTruthy();
      expect(newAccessToken).toBeTruthy();
      expect(typeof newAccessToken).toBe('string');
      expect(newAccessToken.length).toBeGreaterThan(0);
      expect(response.body.user.id).toBe(userId);

      accessToken = newAccessToken;
      refreshToken = newRefreshToken;
    });

    it('should reject old refresh token after rotation', async () => {
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          login: testEmail,
          password: testPassword,
        })
        .expect(200);

      const oldRefreshToken = loginResponse.body.refresh_token;

      await request.post('/api/auth/refresh').send({ refresh_token: oldRefreshToken }).expect(200);

      await request.post('/api/auth/refresh').send({ refresh_token: oldRefreshToken }).expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token-12345' })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request.post('/api/auth/refresh').send({}).expect(400);
    });
  });

  describe('Token rotation', () => {
    let firstRefreshToken: string;
    let secondRefreshToken: string;

    it('should rotate tokens on each refresh', async () => {
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          login: testEmail,
          password: testPassword,
        })
        .expect(200);

      firstRefreshToken = loginResponse.body.refresh_token;

      const firstRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({ refresh_token: firstRefreshToken })
        .expect(200);

      secondRefreshToken = firstRefreshResponse.body.refresh_token;

      expect(secondRefreshToken).not.toBe(firstRefreshToken);

      await request
        .post('/api/auth/refresh')
        .send({ refresh_token: firstRefreshToken })
        .expect(401);

      await request
        .post('/api/auth/refresh')
        .send({ refresh_token: secondRefreshToken })
        .expect(200);
    });
  });
});
