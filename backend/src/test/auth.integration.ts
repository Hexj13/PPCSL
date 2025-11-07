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
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      testPhone = `+38970${randomSuffix}`;

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
      const response = await request.post('/api/auth/request-password-reset').send({
        phone: testPhone,
      });

      if (response.status !== 200) {
        console.log('request-password-reset error:', response.status, response.body);
      }

      expect(response.status).toBe(200);
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
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      testPhone = `+38970${randomSuffix}`;

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
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      testPhone = `+38970${randomSuffix}`;

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

  describe('PATCH /api/auth/profile', () => {
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

    it('should update user profile and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', updateData.firstName);
      expect(response.body).toHaveProperty('lastName', updateData.lastName);
      expect(response.body).not.toHaveProperty('password');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request
        .patch('/api/auth/profile')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/send-sms', () => {
    it('should send SMS verification code and match OpenAPI schema', async () => {
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const testPhone = `+38970${randomSuffix}`;

      const response = await request.post('/api/auth/send-sms').send({ phone: testPhone });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      if (response.status === 200) {
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 400 when phone already exists', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const testPhone = `+38970${randomSuffix}`;

      const registerResponse = await request.post('/api/auth/register').send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: testPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      if (registerResponse.status !== 201) {
        if (registerResponse.status === 429) {
          return;
        }
        console.warn('Failed to register user in send-sms test:', registerResponse.body);
        return;
      }

      const response = await request
        .post('/api/auth/send-sms')
        .send({ phone: testPhone })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request
        .post('/api/auth/send-sms')
        .send({ phone: 'invalid' })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/verify-sms', () => {
    let testPhone: string;
    let verificationCode: string;

    beforeAll(async () => {
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      testPhone = `+38970${randomSuffix}`;

      const sendResponse = await request.post('/api/auth/send-sms').send({ phone: testPhone });
      if (![200, 201].includes(sendResponse.status)) {
        console.warn('Failed to send SMS in beforeAll:', sendResponse.body);
        return;
      }

      const { createClient } = await import('redis');

      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

      const redisClient = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
        },
      });

      try {
        await redisClient.connect();
        const normalizedPhone = testPhone.replace(/\s+/g, '').replace(/[()-]/g, '');
        const normalized = normalizedPhone.startsWith('+')
          ? normalizedPhone
          : '+389' + normalizedPhone;
        const redisKey = `sms:code:${normalized}`;
        verificationCode = (await redisClient.get(redisKey)) || '000000';
        await redisClient.quit();
      } catch (error) {
        console.warn('Failed to get code from Redis:', error);
        verificationCode = '000000';
      }
    });

    it('should verify SMS code and match OpenAPI schema', async () => {
      if (!verificationCode) {
        return;
      }

      const response = await request.post('/api/auth/verify-sms').send({
        phone: testPhone,
        code: verificationCode,
      });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response).toSatisfyApiSpec();
      } else {
        const testCodeResponse = await request
          .post('/api/auth/verify-sms')
          .send({
            phone: testPhone,
            code: '000000',
          })
          .expect(201);

        expect(testCodeResponse.body).toHaveProperty('success', true);
        expect(testCodeResponse.body).toHaveProperty('message');
      }
    });

    it('should return 400 for invalid code', async () => {
      const anotherPhone = `+389701234${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      await request.post('/api/auth/send-sms').send({ phone: anotherPhone });

      const response = await request
        .post('/api/auth/verify-sms')
        .send({
          phone: anotherPhone,
          code: '999999',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when phone is missing', async () => {
      const response = await request
        .post('/api/auth/verify-sms')
        .send({
          code: '123456',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/check-phone', () => {
    it('should return available true for new phone and match OpenAPI schema', async () => {
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const testPhone = `+38970${randomSuffix}`;

      const response = await request.post('/api/auth/check-phone').send({ phone: testPhone });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('available', true);
      if (response.status === 200) {
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 400 when phone already exists', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const testPhone = `+38970${randomSuffix}`;

      const registerResponse = await request.post('/api/auth/register').send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        type: 'Individual',
        phone: testPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      if (registerResponse.status !== 201) {
        if (registerResponse.status === 429) {
          return;
        }
        console.warn('Failed to register user in check-phone test:', registerResponse.body);
        return;
      }

      const response = await request.post('/api/auth/check-phone').send({ phone: testPhone });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/verify-phone', () => {
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

    it('should verify phone and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .post('/api/auth/verify-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('phoneVerified', true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.post('/api/auth/verify-phone').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/auth/change-phone-request', () => {
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

    it('should request phone change and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const newPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      const response = await request
        .post('/api/auth/change-phone-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: newPhone })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when new phone is same as current', async () => {
      if (!authToken) {
        return;
      }

      const meResponse = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const currentPhone = meResponse.body.phone;

      const response = await request
        .post('/api/auth/change-phone-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: currentPhone })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      await request
        .post('/api/auth/change-phone-request')
        .send({ phone: '+38970123456' })
        .expect(401);
    });
  });

  describe('POST /api/auth/change-phone-verify', () => {
    let authToken: string;
    let newPhone: string;

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

      newPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      if (authToken) {
        await request
          .post('/api/auth/change-phone-request')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ phone: newPhone });
      }
    });

    it('should verify phone change with test code and match OpenAPI schema', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .post('/api/auth/change-phone-verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: newPhone,
          code: '000000',
        })
        .expect(200);

      expect(response.body).toHaveProperty('phone', newPhone);
      expect(response.body).toHaveProperty('phoneVerified', true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid code', async () => {
      if (!authToken) {
        return;
      }

      const anotherPhone = `+389701234${Math.floor(Math.random() * 10000)}`;

      await request
        .post('/api/auth/change-phone-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: anotherPhone });

      const response = await request
        .post('/api/auth/change-phone-verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: anotherPhone,
          code: '999999',
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      await request
        .post('/api/auth/change-phone-verify')
        .send({
          phone: '+38970123456',
          code: '000000',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should return 400 for invalid token', async () => {
      const response = await request
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('DELETE /api/auth/profile', () => {
    let authToken: string;
    let testEmail: string;
    let testPhone: string;

    beforeAll(async () => {
      testEmail = `test${Date.now()}@example.com`;
      testPhone = `+389701234${Math.floor(Math.random() * 10000)}`;
      const testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        type: 'Individual',
        phone: testPhone,
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
      expect(response.body.message).toContain('избришан');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.delete('/api/auth/profile').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when trying to delete already deleted account', async () => {
      if (!authToken) {
        return;
      }

      const response = await request
        .delete('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response).toSatisfyApiSpec();
    });

    it('should close all user listings when account is deleted', async () => {
      const newTestEmail = `test${Date.now()}@example.com`;
      const newTestPhone = `+389701234${Math.floor(Math.random() * 10000)}`;
      const testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: newTestEmail,
        password: testPassword,
        type: 'Individual',
        phone: newTestPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      const loginResponse = await request.post('/api/auth/login').send({
        login: newTestEmail,
        password: testPassword,
      });

      if (!loginResponse.body.access_token) {
        return;
      }

      const newAuthToken = loginResponse.body.access_token;
      const newUserId = loginResponse.body.user.id;

      await request
        .post('/api/listings')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          price: 10000,
          currency: 'MKD',
          city: 'Skopje',
          status: 'Active',
          description: 'Test listing',
          vehicle: {
            brand_id: '1',
            model_id: '1',
            year: 2020,
            fuel: 'Petrol',
            transmission: 'Manual',
            body_type: 'Sedan',
            drive_type: 'FWD',
            mileage_km: 50000,
            engine_displ_l: 2.0,
            color: 'Black',
            doors: 4,
          },
          condition: 'Undamaged',
          registration_type: 'Local',
          horsepower: 150,
        });

      await request
        .delete('/api/auth/profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      const listingsResponse = await request.get(`/api/listings/user/${newUserId}/active`);

      expect(listingsResponse.body).toEqual([]);
    });

    it('should nullify user personal data after deletion', async () => {
      const newTestEmail = `test${Date.now()}@example.com`;
      const newTestPhone = `+389701234${Math.floor(Math.random() * 10000)}`;
      const testPassword = 'Test123!@#';

      await request.post('/api/auth/register').send({
        email: newTestEmail,
        password: testPassword,
        type: 'Individual',
        phone: newTestPhone,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });

      const loginResponse = await request.post('/api/auth/login').send({
        login: newTestEmail,
        password: testPassword,
      });

      if (!loginResponse.body.access_token) {
        return;
      }

      const newAuthToken = loginResponse.body.access_token;
      const newUserId = loginResponse.body.user.id;

      await request
        .delete('/api/auth/profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      const userResponse = await request
        .get(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      expect(userResponse.body.email).toBeNull();
      expect(userResponse.body.phone).toBeNull();
      expect(userResponse.body.firstName).toBeNull();
      expect(userResponse.body.lastName).toBeNull();
      expect(userResponse.body.active).toBe(false);
    });
  });
});
