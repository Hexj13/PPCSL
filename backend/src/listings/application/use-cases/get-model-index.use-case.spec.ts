import { GetModelIndexUseCase } from './get-model-index.use-case';

describe('GetModelIndexUseCase', () => {
  const items = [
    { brand: 'BMW', model: 'X5', listingCount: 3 },
    { brand: 'Toyota', model: 'Corolla', listingCount: 5 },
  ];

  let listingRepo: { getModelIndexAggregates: jest.Mock };
  let listingCache: {
    getModelIndex: jest.Mock;
    setModelIndex: jest.Mock;
  };
  let useCase: GetModelIndexUseCase;

  beforeEach(() => {
    listingRepo = {
      getModelIndexAggregates: jest.fn().mockResolvedValue(items),
    };
    listingCache = {
      getModelIndex: jest.fn().mockResolvedValue(null),
      setModelIndex: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new GetModelIndexUseCase(listingRepo as never, listingCache as never);
  });

  it('returns cached data on cache hit', async () => {
    const cached = { generatedAt: '2026-08-11T00:00:00.000Z', items };
    listingCache.getModelIndex.mockResolvedValue(cached);

    const result = await useCase.execute();

    expect(result).toEqual(cached);
    expect(listingRepo.getModelIndexAggregates).not.toHaveBeenCalled();
    expect(listingCache.setModelIndex).not.toHaveBeenCalled();
  });

  it('computes and caches data on cache miss', async () => {
    const result = await useCase.execute();

    expect(listingRepo.getModelIndexAggregates).toHaveBeenCalled();
    expect(listingCache.setModelIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        items,
        generatedAt: expect.any(String),
      }),
    );
    expect(result.items).toEqual(items);
  });
});
