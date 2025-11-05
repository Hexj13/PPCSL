import { getTestRequest } from './setup-integration';

describe('Cities API Integration Tests', () => {
  const request = getTestRequest();

  describe('GET /api/cities', () => {
    it('should return list of cities and match OpenAPI schema', async () => {
      const response = await request.get('/api/cities').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });
  });
});
