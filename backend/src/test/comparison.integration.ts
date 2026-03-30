/// <reference path="./jest-openapi.d.ts" />
import { getTestRequest } from './setup-integration';

describe('Comparison API Integration Tests', () => {
  let request: ReturnType<typeof getTestRequest>;
  let authToken: string;
  let publicListingId: string | undefined;

  beforeAll(async () => {
    request = getTestRequest();
    const ts = Date.now();
    const testEmail = `comparison${ts}@example.com`;
    const testPassword = 'Test123!@#';

    const registerRes = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+38971${String(ts).slice(-7)}`,
      firstName: 'Test',
      lastName: 'User',
      termsAccepted: true,
    });
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
    }

    const loginResponse = await request.post('/api/auth/login').send({
      login: testEmail,
      password: testPassword,
    });

    if (!loginResponse.body.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = loginResponse.body.access_token;

    const listingsRes = await request.get('/api/listings').query({ page: 1, limit: 5 }).expect(200);
    const first = listingsRes.body?.data?.[0];
    if (first?.id) {
      publicListingId = first.id;
    }
  });

  it('returns 401 for GET /api/comparison/ids without token', async () => {
    await request.get('/api/comparison/ids').expect(401);
  });

  it('returns empty ids for new user', async () => {
    const res = await request
      .get('/api/comparison/ids')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ vehicleListingIds: [], tireListingIds: [] });
    expect(res).toSatisfyApiSpec();
  });

  it('sync merges and returns shape', async () => {
    const res = await request
      .post('/api/comparison/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vehicleListingIds: [], tireListingIds: [] })
      .expect(200);

    expect(res.body).toHaveProperty('vehicleListingIds');
    expect(res.body).toHaveProperty('tireListingIds');
    expect(res).toSatisfyApiSpec();
  });

  it('adds listing when public listing exists', async () => {
    if (!publicListingId) {
      return;
    }

    const addRes = await request
      .post(`/api/comparison/${publicListingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(addRes.body).toHaveProperty('listing_id', publicListingId);
    expect(addRes).toSatisfyApiSpec();

    const idsRes = await request
      .get('/api/comparison/ids')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const inVehicle = idsRes.body.vehicleListingIds?.includes(publicListingId);
    const inTire = idsRes.body.tireListingIds?.includes(publicListingId);
    expect(inVehicle || inTire).toBe(true);

    await request
      .delete(`/api/comparison/${publicListingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request
      .delete(`/api/comparison/${publicListingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('returns 400 for invalid listing UUID on POST', async () => {
    await request
      .post('/api/comparison/not-a-uuid')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
  });

  it('returns 404 for non-existent listing on POST', async () => {
    const res = await request
      .post('/api/comparison/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(res.body).toMatchObject({ statusCode: 404, errorKey: 'errors.listingNotFound' });
  });
});
