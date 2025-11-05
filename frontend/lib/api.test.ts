import { Listing } from './api';

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn(() => mockAxiosInstance),
  };
});

const { listingsApi } = require('./api');

describe('listingsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByVin', () => {
    it('should call API with correct VIN parameter', async () => {
      const vin = 'TESTVIN123456789';
      const mockListings: Listing[] = [
        {
          id: 'listing-1',
          title: 'Test Car 1',
          price: 10000,
          currency: 'MKD',
          city: 'Skopje',
          status: 'Closed',
          vin,
          last_updated_at: '2024-01-15T00:00:00Z',
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockListings });

      const result = await listingsApi.getByVin(vin);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/listings/vin/${vin}`, {
        params: {},
      });
      expect(result.data).toEqual(mockListings);
    });

    it('should include excludeId in params when provided', async () => {
      const vin = 'TESTVIN123456789';
      const excludeId = 'current-listing-id';
      const mockListings: Listing[] = [];

      mockAxiosInstance.get.mockResolvedValue({ data: mockListings });

      await listingsApi.getByVin(vin, excludeId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/listings/vin/${vin}`, {
        params: { excludeId },
      });
    });

    it('should return empty array when no listings found', async () => {
      const vin = 'NONEXISTENTVIN';
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await listingsApi.getByVin(vin);

      expect(result.data).toEqual([]);
    });

    it('should handle API errors', async () => {
      const vin = 'TESTVIN123456789';
      const axiosError = {
        message: 'Network Error',
        isAxiosError: true,
      };
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(listingsApi.getByVin(vin)).rejects.toEqual(axiosError);
    });
  });
});
