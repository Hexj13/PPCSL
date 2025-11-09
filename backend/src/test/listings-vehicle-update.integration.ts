import * as supertest from 'supertest';
import { DataSource } from 'typeorm';

import { AppDataSource } from '../data-source';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

import { getTestRequest } from './setup-integration';

describe('Listings Vehicle Update Integration Test', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;
  let listingId: string;
  let vehicleId: string;
  let oldBrandId: string;
  let oldModelId: string;
  let newBrandId: string;
  let newModelId: string;
  let dataSource: DataSource;
  const shouldSkipTest = false;

  beforeAll(async () => {
    request = getTestRequest();
    dataSource = AppDataSource;

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

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
    while ((registerResponse.status === 429 || registerResponse.status === 400) && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * (retries + 1)));
      registerResponse = await request.post('/api/auth/register').send({
        email: `test${Date.now() + retries + Math.random()}@example.com`,
        password: testPassword,
        type: 'Individual',
        phone: `+3897${Math.floor(Math.random() * 100000000)}`,
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
      retries++;
    }

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    const actualEmail = retries > 0 ? registerResponse.body.email || testEmail : testEmail;

    const loginResponse = await request.post('/api/auth/login').send({
      login: actualEmail,
      password: testPassword,
    });

    if (!loginResponse.body.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = loginResponse.body.access_token;

    const brandsResponse = await request.get('/api/brands').expect(200);
    const brands = brandsResponse.body;

    if (brands.length < 2) {
      console.warn(
        'Skipping test: Need at least 2 brands for test, but only',
        brands.length,
        'found',
      );
      shouldSkipTest = true;
      return;
    }

    oldBrandId = brands[0].id;
    const oldModelsResponse = await request.get(`/api/brands/${oldBrandId}/models`).expect(200);
    const oldModels = oldModelsResponse.body;

    if (oldModels.length === 0) {
      throw new Error('Old brand has no models');
    }

    oldModelId = oldModels[0].id;

    newBrandId = brands[1].id;
    const newModelsResponse = await request.get(`/api/brands/${newBrandId}/models`).expect(200);
    const newModels = newModelsResponse.body;

    if (newModels.length === 0) {
      throw new Error('New brand has no models');
    }

    newModelId = newModels[0].id;

    const listingResponse = await request
      .post('/api/listings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        price: 10000,
        currency: 'MKD',
        city: 'Skopje',
        description: 'Test description',
        images: [
          'http://localhost:4000/uploads/test-image-1.webp',
          'http://localhost:4000/uploads/test-image-2.webp',
        ],
        condition: 'Undamaged',
        registration_type: 'Local',
        horsepower: 150,
        vehicle: {
          brand_id: oldBrandId,
          model_id: oldModelId,
          year: 2020,
          body_type: 'Sedan',
          engine_displ_l: 2.0,
          mileage_km: 50000,
          fuel: 'Petrol',
          transmission: 'Manual',
          drive_type: 'FWD',
        },
      });

    if (listingResponse.status !== 201) {
      console.error('Failed to create listing:', listingResponse.body);
      throw new Error(`Failed to create listing: ${JSON.stringify(listingResponse.body)}`);
    }

    listingId = listingResponse.body.id;
    vehicleId = listingResponse.body.vehicle_id;
  });

  it('should update vehicle brand_id and model_id in database', async () => {
    if (shouldSkipTest || !oldBrandId || !newBrandId) {
      console.warn('Skipping test: Not enough brands available');
      return;
    }
    const vehicleRepo = dataSource.getRepository(Vehicle);
    const listingRepo = dataSource.getRepository(Listing);

    const vehicleBefore = await vehicleRepo.findOne({ where: { id: vehicleId } });
    expect(vehicleBefore).toBeTruthy();
    expect(vehicleBefore!.brand_id).toBe(oldBrandId);
    expect(vehicleBefore!.model_id).toBe(oldModelId);

    const updateResponse = await request
      .patch(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vehicle: {
          brand_id: newBrandId,
          model_id: newModelId,
          year: 2021,
          body_type: 'SUV',
          drive_type: 'AWD',
        },
      })
      .expect(200);

    expect(updateResponse.body.vehicle.brand_id).toBe(newBrandId);
    expect(updateResponse.body.vehicle.model_id).toBe(newModelId);

    const vehicleAfter = await vehicleRepo.findOne({ where: { id: vehicleId } });
    expect(vehicleAfter).toBeTruthy();
    expect(vehicleAfter!.brand_id).toBe(newBrandId);
    expect(vehicleAfter!.model_id).toBe(newModelId);

    const listingAfter = await listingRepo.findOne({
      where: { id: listingId },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
    });

    expect(listingAfter).toBeTruthy();
    expect(listingAfter!.vehicle).toBeTruthy();
    expect(listingAfter!.vehicle!.brand_id).toBe(newBrandId);
    expect(listingAfter!.vehicle!.model_id).toBe(newModelId);
    expect(listingAfter!.vehicle!.brand).toBeTruthy();
    expect(listingAfter!.vehicle!.model).toBeTruthy();
    expect(listingAfter!.vehicle!.brand!.id).toBe(newBrandId);
    expect(listingAfter!.vehicle!.model!.id).toBe(newModelId);

    const getResponse = await request.get(`/api/listings/${listingId}`).expect(200);
    expect(getResponse.body.vehicle.brand_id).toBe(newBrandId);
    expect(getResponse.body.vehicle.model_id).toBe(newModelId);
    expect(getResponse.body.vehicle.brand.id).toBe(newBrandId);
    expect(getResponse.body.vehicle.model.id).toBe(newModelId);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
});
