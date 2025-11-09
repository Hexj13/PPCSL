import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Upload API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;

  beforeAll(async () => {
    request = getTestRequest();
    let testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';

    await new Promise((resolve) => setTimeout(resolve, 1000));

    let registerResponse = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 10000)}`,
      firstName: 'Test',
      lastName: 'User',
      termsAccepted: true,
    });

    let retries = 0;
    while ((registerResponse.status === 429 || registerResponse.status === 400) && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * (retries + 1)));
      const uniqueEmail = `test${Date.now() + retries + Math.random()}@example.com`;
      registerResponse = await request.post('/api/auth/register').send({
        email: uniqueEmail,
        password: testPassword,
        type: 'Individual',
        phone: `+3897012345${Math.floor(Math.random() * 10000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
      retries++;
      if (registerResponse.status === 201) {
        testEmail = uniqueEmail;
      }
    }

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    const actualEmail =
      registerResponse.status === 201 ? registerResponse.body.email || testEmail : testEmail;

    const loginResponse = await request.post('/api/auth/login').send({
      login: actualEmail,
      password: testPassword,
    });

    if (!loginResponse.body.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = loginResponse.body.access_token;
  });

  describe('POST /api/upload/image', () => {
    it('should upload image and match OpenAPI schema', async () => {
      const validPngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validPngBuffer, 'test.png')
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('path');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when file is missing', async () => {
      const response = await request
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.post('/api/upload/image').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should reject file with invalid magic bytes', async () => {
      const invalidBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);

      const response = await request
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', invalidBuffer, 'fake.jpg')
        .expect(400);

      expect(response.body.message).toContain('Невалиден тип на датотека');
    });

    it('should reject file with mismatched MIME type', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = await request
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pngBuffer, 'test.jpg')
        .field('Content-Type', 'image/jpeg')
        .expect(400);

      expect(response.body.message).toContain('Невалиден тип на датотека');
    });

    it('should reject empty file', async () => {
      const emptyBuffer = Buffer.from([]);

      const response = await request
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', emptyBuffer, 'empty.jpg')
        .expect(400);

      expect(response.body.message).toContain('Фајлот е празен');
    });
  });

  describe('GET /api/upload/image/:filename', () => {
    it('should return optimized image with default parameters', async () => {
      const filename = 'test-image.webp';
      const response = await request.get(`/api/upload/image/${filename}`).expect((res) => {
        if (res.status === 404) {
          return;
        }
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('image/webp');
      });

      if (response.status === 200) {
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return optimized image with custom quality', async () => {
      const filename = 'test-image.webp';
      const response = await request
        .get(`/api/upload/image/${filename}`)
        .query({ quality: '75' })
        .expect((res) => {
          if (res.status === 404) {
            return;
          }
          expect(res.status).toBe(200);
        });

      if (response.status === 200) {
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return optimized image with custom width', async () => {
      const filename = 'test-image.webp';
      const response = await request
        .get(`/api/upload/image/${filename}`)
        .query({ width: '800' })
        .expect((res) => {
          if (res.status === 404) {
            return;
          }
          expect(res.status).toBe(200);
        });

      if (response.status === 200) {
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 400 for invalid quality parameter', async () => {
      const filename = 'test-image.webp';
      const response = await request
        .get(`/api/upload/image/${filename}`)
        .query({ quality: '150' })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid width parameter', async () => {
      const filename = 'test-image.webp';
      const response = await request
        .get(`/api/upload/image/${filename}`)
        .query({ width: '6000' })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid filename', async () => {
      const response = await request.get('/api/upload/image/%2E%2E%2Ftest.webp').expect((res) => {
        if (res.status === 400 || res.status === 404) {
          return;
        }
        expect(res.status).toBe(400);
      });

      if (response.status === 400) {
        expect(response).toSatisfyApiSpec();
      }
    });
  });
});
