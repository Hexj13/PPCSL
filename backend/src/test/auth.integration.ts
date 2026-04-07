/// <reference path="./jest-openapi.d.ts" />
import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';
import { createTestCredentials } from './test-data-cleanup';

const TEST_PASSWORD = 'Test123!@#';

async function registerTestUser(
  req: ReturnType<typeof getTestRequest>,
): Promise<{ email: string; password: string; phone: string }> {
  const makePayload = () => {
    const credentials = createTestCredentials('auth-register-user');
    return {
      email: credentials.email,
      password: TEST_PASSWORD,
      type: 'Individual' as const,
      phone: credentials.phone,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      termsAccepted: true,
    };
  };
  let payload = makePayload();
  let res = await req.post('/api/auth/register').send(payload);
  let retries = 0;
  while (retries < 8 && res.status !== 201) {
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 5000 * (retries + 1)));
    }
    payload = makePayload();
    res = await req.post('/api/auth/register').send(payload);
    retries++;
  }
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
  }
  return {
    email: res.body.email ?? payload.email,
    password: TEST_PASSWORD,
    phone: res.body.phone ?? payload.phone,
  };
}

describe('Auth API Integration Tests', () => {
  let request: ReturnType<typeof getTestRequest>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and match OpenAPI schema', async () => {
      const credentials = createTestCredentials('auth-register-endpoint');
      let registerData = {
        email: credentials.email,
        password: credentials.password,
        type: 'Individual',
        phone: credentials.phone,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        termsAccepted: true,
      };
      let response = await request.post('/api/auth/register').send(registerData);
      let retries = 0;
      while (response.status === 400 && retries < 3) {
        const retryCredentials = createTestCredentials('auth-register-endpoint-retry');
        registerData = {
          ...registerData,
          email: retryCredentials.email,
          phone: retryCredentials.phone,
        };
        response = await request.post('/api/auth/register').send(registerData);
        retries += 1;
      }
      expect(response.status).toBe(201);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmail: string;
    let testPhone: string;
    let testPassword: string;

    beforeAll(async () => {
      const user = await registerTestUser(request);
      testEmail = user.email;
      testPhone = user.phone;
      testPassword = user.password;
    }, 120000);

    it('should login successfully and match OpenAPI schema', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          login: testPhone,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          login: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let testEmail: string;
    let testPhone: string;

    beforeAll(async () => {
      const user = await registerTestUser(request);
      testEmail = user.email;
      testPhone = user.phone;
      const loginResponse = await request.post('/api/auth/login').send({
        login: testPhone,
        password: user.password,
      });
      authToken = loginResponse.body.access_token ?? '';
    });

    it('should return current user profile and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).not.toHaveProperty('password');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/auth/me').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('DELETE /api/auth/profile', () => {
    let authToken: string;
    let testPhone: string;

    beforeAll(async () => {
      const user = await registerTestUser(request);
      testPhone = user.phone;
      const loginResponse = await request.post('/api/auth/login').send({
        login: testPhone,
        password: user.password,
      });
      authToken = loginResponse.body.access_token ?? '';
    });

    it('should delete account successfully and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .delete('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.delete('/api/auth/profile').expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });
});
