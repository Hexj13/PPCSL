import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { RedisService } from '../common/redis.service';
import { Listing } from '../listings/entities/listing.entity';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';
import { User } from '../users/entities/user.entity';

import { SitemapService } from './sitemap.service';

const mockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

describe('SitemapService', () => {
  let service: SitemapService;

  const qb = mockQueryBuilder();

  const mockListingRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    query: jest.fn().mockResolvedValue([]),
  };

  const mockBrandRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockModelRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
  };

  const mockUserRepo = {
    query: jest.fn().mockResolvedValue([]),
  };

  const mockTireBrandRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockTireModelRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitemapService,
        { provide: getRepositoryToken(Listing), useValue: mockListingRepo },
        { provide: getRepositoryToken(Brand), useValue: mockBrandRepo },
        { provide: getRepositoryToken(VehicleModel), useValue: mockModelRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(TireBrand), useValue: mockTireBrandRepo },
        { provide: getRepositoryToken(TireModel), useValue: mockTireModelRepo },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SitemapService>(SitemapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPagesSitemap', () => {
    it('should return valid XML with expected static URLs', async () => {
      const xml = await service.getPagesSitemap();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>');
      expect(xml).toContain('/listings</loc>');
      expect(xml).toContain('/terms</loc>');
      expect(xml).toContain('/privacy</loc>');
      expect(xml).toContain('/faq</loc>');
      expect(xml).toContain('/contacts</loc>');
      expect(xml).toContain('/cookie-settings</loc>');
      expect(xml).toContain('<changefreq>daily</changefreq>');
      expect(xml).toContain('<priority>1</priority>');
    });

    it('should return cached result when available', async () => {
      const cachedXml = '<urlset>cached</urlset>';
      mockRedis.get.mockResolvedValueOnce(cachedXml);

      const xml = await service.getPagesSitemap();

      expect(xml).toBe(cachedXml);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should save result to cache', async () => {
      await service.getPagesSitemap();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'sitemap:pages',
        expect.stringContaining('<?xml'),
        3600,
      );
    });
  });

  describe('getListingsSitemap', () => {
    it('should return null for invalid month format', async () => {
      expect(await service.getListingsSitemap('invalid')).toBeNull();
      expect(await service.getListingsSitemap('2024-1')).toBeNull();
      expect(await service.getListingsSitemap('24-01')).toBeNull();
      expect(await service.getListingsSitemap('')).toBeNull();
    });

    it('should return null when no listings found', async () => {
      qb.getMany.mockResolvedValueOnce([]);

      const result = await service.getListingsSitemap('2024-01');

      expect(result).toBeNull();
    });

    it('should return valid XML when listings exist', async () => {
      qb.getMany.mockResolvedValueOnce([
        { id: 'listing-1', updated_at: new Date('2024-01-15') },
        { id: 'listing-2', updated_at: new Date('2024-01-20') },
      ]);

      const xml = await service.getListingsSitemap('2024-01');

      expect(xml).not.toBeNull();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('/listings/listing-1</loc>');
      expect(xml).toContain('/listings/listing-2</loc>');
      expect(xml).toContain('<changefreq>hourly</changefreq>');
      expect(xml).toContain('<priority>0.9</priority>');
    });
  });

  describe('getSitemapIndex', () => {
    it('should return valid sitemap index XML', async () => {
      mockListingRepo.query.mockResolvedValueOnce([{ month: '2024-01' }, { month: '2024-02' }]);

      const xml = await service.getSitemapIndex();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('/sitemaps/pages.xml</loc>');
      expect(xml).toContain('/sitemaps/brands-car.xml</loc>');
      expect(xml).toContain('/sitemaps/brands-truck.xml</loc>');
      expect(xml).toContain('/sitemaps/brands-moto.xml</loc>');
      expect(xml).toContain('/sitemaps/tires.xml</loc>');
      expect(xml).toContain('/sitemaps/sellers.xml</loc>');
      expect(xml).toContain('/sitemaps/listings-2024-01.xml</loc>');
      expect(xml).toContain('/sitemaps/listings-2024-02.xml</loc>');
    });

    it('should return index without listing sitemaps when no active months', async () => {
      mockListingRepo.query.mockResolvedValueOnce([]);

      const xml = await service.getSitemapIndex();

      expect(xml).toContain('/sitemaps/pages.xml</loc>');
      expect(xml).not.toContain('/sitemaps/listings-');
    });
  });

  describe('getSellersSitemap', () => {
    it('should return valid XML with seller board URLs', async () => {
      mockUserRepo.query.mockResolvedValueOnce([
        { board_slug: 'dealer-one', last_updated: '2024-01-15' },
        { board_slug: 'dealer-two', last_updated: '2024-02-10' },
      ]);

      const xml = await service.getSellersSitemap();

      expect(xml).toContain('/board/dealer-one</loc>');
      expect(xml).toContain('/board/dealer-two</loc>');
      expect(xml).toContain('<priority>0.6</priority>');
    });

    it('should return empty urlset when no sellers', async () => {
      mockUserRepo.query.mockResolvedValueOnce([]);

      const xml = await service.getSellersSitemap();

      expect(xml).toContain('<urlset');
      expect(xml).not.toContain('<url>');
    });
  });

  describe('getTiresSitemap', () => {
    it('should include base tire category URL', async () => {
      const xml = await service.getTiresSitemap();

      expect(xml).toContain('category=tire</loc>');
      expect(xml).toContain('<priority>0.85</priority>');
    });

    it('should include tire brand URLs', async () => {
      mockTireBrandRepo.find.mockResolvedValueOnce([
        { id: 'tb-1', name: 'Michelin', is_archived: false },
      ]);

      const xml = await service.getTiresSitemap();

      expect(xml).toContain('tire_brand_ids=tb-1</loc>');
    });
  });
});
