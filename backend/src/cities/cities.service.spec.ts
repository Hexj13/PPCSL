import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../common/redis.service';

import { CitiesService } from './cities.service';

describe('CitiesService', () => {
  let service: CitiesService;

  beforeEach(async () => {
    const mockRedisService = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CitiesService>(CitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all cities sorted by name', async () => {
      const result = await service.getAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('nameEn');

      const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      expect(result).toEqual(sorted);
    });

    it('should return cities with Macedonian and English names', async () => {
      const result = await service.getAll();

      const skopje = result.find((city) => city.nameEn === 'Skopje');
      expect(skopje).toBeDefined();
      expect(skopje?.name).toBe('Скопје');
    });
  });

  describe('findByName', () => {
    it('should find city by Macedonian name', () => {
      const result = service.findByName('Скопје');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Скопје');
      expect(result?.nameEn).toBe('Skopje');
    });

    it('should find city by English name', () => {
      const result = service.findByName('Skopje');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Скопје');
      expect(result?.nameEn).toBe('Skopje');
    });

    it('should find city case-insensitively', () => {
      const result = service.findByName('skopje');

      expect(result).toBeDefined();
      expect(result?.nameEn).toBe('Skopje');
    });

    it('should return undefined for non-existent city', () => {
      const result = service.findByName('NonExistentCity');

      expect(result).toBeUndefined();
    });
  });
});
