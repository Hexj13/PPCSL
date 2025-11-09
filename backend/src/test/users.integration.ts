import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Users API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    request = getTestRequest();
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';

    await new Promise((resolve) => setTimeout(resolve, 500));

    let registerResponse = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
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
        phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
      retries++;
    }

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    userId = registerResponse.body.id;
    const actualEmail = retries > 0 ? registerResponse.body.email || testEmail : testEmail;

    const loginResponse = await request.post('/api/auth/login').send({
      login: actualEmail,
      password: testPassword,
    });

    if (!loginResponse.body.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = loginResponse.body.access_token;
  });

  describe('GET /api/users', () => {
    it('should return all users and match OpenAPI schema', async () => {
      const response = await request
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).not.toHaveProperty('password');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/users').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user details and match OpenAPI schema', async () => {
      const response = await request.get(`/api/users/${userId}`).expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).not.toHaveProperty('password');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`/api/users/${nonExistentId}`).expect(404);

      expect(response).toSatisfyApiSpec();
    });
  });
});
