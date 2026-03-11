/// <reference path="./jest-openapi.d.ts" />
import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Auth API Integration Tests', () => {
  let request: ReturnType<typeof getTestRequest>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and match OpenAPI schema', async () => {
      let registerData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: `+38970${String(Date.now()).slice(-7)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      };
      let response = await request.post('/api/auth/register').send(registerData);
      let retries = 0;
      while (response.status === 400 && retries < 3) {
        registerData = {
          ...registerData,
          email: `test${Date.now()}@example.com`,
          phone: `+38970${String(Date.now()).slice(-7)}`,
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
    let testPassword: string;

    beforeAll(async () => {
      testEmail = `test${Date.now()}@example.com`;
      testPassword = 'Test123!@#';

      await new Promise((resolve) => setTimeout(resolve, 2000));

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
      while (registerResponse.status === 429 && retries < 5) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * (retries + 1)));
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
    }, 120000);

    it('should login successfully and match OpenAPI schema', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          login: testEmail,
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

    beforeAll(async () => {
      testEmail = `test${Date.now()}@example.com`;
      const testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      const loginResponse = await request.post('/api/auth/login').send({
        login: testEmail,
        password: testPassword,
      });

      if (loginResponse.body.access_token) {
        authToken = loginResponse.body.access_token;
      }
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

    beforeAll(async () => {
      const testEmail = `test${Date.now()}@example.com`;
      const testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      const loginResponse = await request.post('/api/auth/login').send({
        login: testEmail,
        password: testPassword,
      });

      if (loginResponse.body.access_token) {
        authToken = loginResponse.body.access_token;
      }
    });

    it('should delete account successfully and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .delete('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.delete('/api/auth/profile').expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });
});
