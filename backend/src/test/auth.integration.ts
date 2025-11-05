import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Auth API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and match OpenAPI schema', async () => {
      const registerData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      };

      const response = await request.post('/api/auth/register').send(registerData).expect(201);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when terms are not accepted', async () => {
      const registerData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        termsAccepted: false,
      };

      const response = await request.post('/api/auth/register').send(registerData).expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid data', async () => {
      const registerData = {
        email: 'invalid-email',
        password: '123',
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        termsAccepted: true,
      };

      const response = await request.post('/api/auth/register').send(registerData).expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = `test${Date.now()}@example.com`;
      testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        type: 'Individual',
        phone: `+389701234${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
    });

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
});
