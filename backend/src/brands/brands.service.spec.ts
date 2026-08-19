import { BrandsService } from './brands.service';

describe('BrandsService.findAll', () => {
  const staleCached = [{ id: 'stale-id', name: 'Dacia' }];
  const dbBrands = [{ id: 'real-id', name: 'Dacia' }];

  function createService(existingCount: number) {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(dbBrands),
    };
    const brandsRepository = {
      count: jest.fn().mockResolvedValue(existingCount),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const brandsCache = {
      getBrands: jest.fn().mockResolvedValue(staleCached),
      setBrands: jest.fn(),
      invalidateAll: jest.fn(),
      getModels: jest.fn(),
      setModels: jest.fn(),
      getSuggestIndex: jest.fn(),
      setSuggestIndex: jest.fn(),
      invalidateModels: jest.fn(),
      invalidateBrandsList: jest.fn(),
    };
    const service = new BrandsService(
      brandsRepository as never,
      {} as never,
      brandsCache as never,
      { translate: jest.fn() } as never,
    );
    return { service, brandsCache, brandsRepository };
  }

  it('rebuilds brands cache when cached IDs are missing in the database', async () => {
    const { service, brandsCache } = createService(0);
    const result = await service.findAll('car');
    expect(brandsCache.invalidateAll).toHaveBeenCalled();
    expect(result).toEqual(dbBrands);
    expect(brandsCache.setBrands).toHaveBeenCalledWith('car', dbBrands);
  });

  it('returns cached brands when every cached ID still exists', async () => {
    const { service, brandsCache } = createService(1);
    const result = await service.findAll('car');
    expect(brandsCache.invalidateAll).not.toHaveBeenCalled();
    expect(brandsCache.setBrands).not.toHaveBeenCalled();
    expect(result).toEqual(staleCached);
  });
});
