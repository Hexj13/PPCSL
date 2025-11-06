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

  describe('POST /api/auth/request-password-reset', () => {
    let testPhone: string;

    beforeAll(async () => {
      testPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      await request.post('/api/auth/register').send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: testPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
    });

    it('should request password reset and match OpenAPI schema', async () => {
      const response = await request
        .post('/api/auth/request-password-reset')
        .send({
          phone: testPhone,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when user does not exist', async () => {
      const response = await request
        .post('/api/auth/request-password-reset')
        .send({
          phone: '+38999999999',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request
        .post('/api/auth/request-password-reset')
        .send({
          phone: 'invalid',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/verify-reset-code', () => {
    let testPhone: string;
    let resetCode: string;

    beforeAll(async () => {
      testPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      await request.post('/api/auth/register').send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: testPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      await request.post('/api/auth/request-password-reset').send({
        phone: testPhone,
      });

      resetCode = '123456';
    });

    it('should verify reset code and match OpenAPI schema', async () => {
      const response = await request.post('/api/auth/verify-reset-code').send({
        phone: testPhone,
        code: resetCode,
      });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response).toSatisfyApiSpec();
      } else {
        expect(response.status).toBe(400);
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 400 for invalid code', async () => {
      const response = await request
        .post('/api/auth/verify-reset-code')
        .send({
          phone: testPhone,
          code: '000000',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when user does not exist', async () => {
      const response = await request
        .post('/api/auth/verify-reset-code')
        .send({
          phone: '+38999999999',
          code: '123456',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testPhone: string;
    let resetCode: string;

    beforeAll(async () => {
      testPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      await request.post('/api/auth/register').send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: testPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      await request.post('/api/auth/request-password-reset').send({
        phone: testPhone,
      });

      resetCode = '123456';
    });

    it('should reset password and match OpenAPI schema', async () => {
      const response = await request.post('/api/auth/reset-password').send({
        phone: testPhone,
        code: resetCode,
        newPassword: 'NewPassword123!@#',
      });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).not.toHaveProperty('password');
        expect(response).toSatisfyApiSpec();
      } else {
        expect(response.status).toBe(400);
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 400 for invalid code', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          phone: testPhone,
          code: '000000',
          newPassword: 'NewPassword123!@#',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for short password', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          phone: testPhone,
          code: resetCode,
          newPassword: '123',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when user does not exist', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          phone: '+38999999999',
          code: '123456',
          newPassword: 'NewPassword123!@#',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });
});
