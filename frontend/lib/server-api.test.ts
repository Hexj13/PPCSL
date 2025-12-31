import { getListings } from './server-api';

const originalFetch = global.fetch;
const originalEnv = process.env.NODE_ENV;

describe('server-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv !== undefined) {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    }
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  describe('getListings', () => {
    it('should fetch listings with default params', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getListings({});

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/listings?page=1&limit=20',
        expect.objectContaining({
          next: expect.any(Object),
          cache: expect.any(String),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle search params correctly', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({
        brand_id: 'brand-1',
        city: 'Skopje',
        year_gte: '2020',
        price_lte: '50000',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('brand_id=brand-1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('city=Skopje'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('year_gte=2020'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('price_lte=50000'),
        expect.any(Object)
      );
    });

    it('should parse numeric params correctly', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({
        year_gte: '2020',
        year_lte: '2025',
        price_gte: '10000',
        price_lte: '50000',
        mileage_gte: '0',
        mileage_lte: '100000',
        horsepower_gte: '100',
        horsepower_lte: '200',
        engine_displ_l_gte: '1.5',
        engine_displ_l_lte: '3.0',
      });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const url = new URL(callUrl);
      expect(url.searchParams.get('year_gte')).toBe('2020');
      expect(url.searchParams.get('year_lte')).toBe('2025');
      expect(url.searchParams.get('price_gte')).toBe('10000');
      expect(url.searchParams.get('price_lte')).toBe('50000');
    });

    it('should handle boolean params', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({
        urgent: 'true',
        is_new: 'true',
        is_registered: 'false',
      });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const url = new URL(callUrl);
      expect(url.searchParams.get('urgent')).toBe('true');
      expect(url.searchParams.get('is_new')).toBe('true');
      expect(url.searchParams.get('is_registered')).toBe('false');
    });

    it('should handle array params', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({
        brand_ids: ['brand-1', 'brand-2'],
        cities: ['Skopje', 'Bitola'],
      });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const url = new URL(callUrl);
      expect(url.searchParams.get('brand_ids')).toBe('brand-1,brand-2');
      expect(url.searchParams.get('cities')).toBe('Skopje,Bitola');
    });

    it('should decode encoded arrays when _e flag is present', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const encoded = Buffer.from(JSON.stringify(['brand-1', 'brand-2']))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      await getListings({
        _e: '1',
        brand_ids: encoded,
      });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const url = new URL(callUrl);
      const decoded = url.searchParams.get('brand_ids');
      expect(decoded).toBe('brand-1,brand-2');
    });

    it('should return empty data on ECONNREFUSED error in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      const connectionError = new Error('ECONNREFUSED');

      (global.fetch as jest.Mock).mockRejectedValue(connectionError);

      const result = await getListings({});

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('should return empty data on fetch failed error in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      const fetchError = new Error('fetch failed');

      (global.fetch as jest.Mock).mockRejectedValue(fetchError);

      const result = await getListings({});

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('should return empty data on network error in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      const networkError = new Error('network error');

      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const result = await getListings({});

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await getListings({});

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('should use correct cache settings in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 0 },
          cache: 'no-store',
        })
      );
    });

    it('should use correct cache settings in production', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getListings({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: { revalidate: 30 },
          cache: 'default',
        })
      );
    });
  });
});
