import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { LISTING_REPOSITORY } from '../ports/listing.repository.port';
import { GetReportUrlUseCase } from './get-report-url.use-case';

describe('GetReportUrlUseCase', () => {
  let useCase: GetReportUrlUseCase;
  let mockListingRepo: { findById: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const listingId = '550e8400-e29b-41d4-a716-446655440000';
  const vin = 'WBA21FL020CV09474';
  const secretKey = 'test-secret-key';

  const mockListing = {
    id: listingId,
    vin,
    title: 'Test',
    status: 'Active',
  };

  beforeEach(async () => {
    mockListingRepo = { findById: jest.fn().mockResolvedValue(mockListing) };
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'INFOCAR_SECRET_KEY') return secretKey;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetReportUrlUseCase,
        { provide: LISTING_REPOSITORY, useValue: mockListingRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get(GetReportUrlUseCase);
  });

  it('should return URL with infocar.md host when locale is ro or omitted', async () => {
    const { url } = await useCase.execute(listingId);
    expect(url).toContain('https://infocar.md');
    expect(url).toContain('from=kupito');
    expect(url).toContain('vin=');

    const { url: urlRo } = await useCase.execute(listingId, 'ro');
    expect(urlRo).toContain('https://infocar.md');
  });

  it('should return URL with ru.infocar.md host when locale is ru', async () => {
    const { url } = await useCase.execute(listingId, 'ru');
    expect(url).toContain('https://ru.infocar.md');
    expect(url).toContain('from=kupito');
    expect(url).toContain('vin=');
  });

  it('should normalize locale value and return RU host for uppercase locale', async () => {
    const { url } = await useCase.execute(listingId, ' RU ');
    expect(url).toContain('https://ru.infocar.md');
  });

  it('should fallback to RO host for unknown locale', async () => {
    const { url } = await useCase.execute(listingId, 'de');
    expect(url).toContain('https://infocar.md');
  });

  it('should throw when listing is not found', async () => {
    mockListingRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(listingId)).rejects.toThrow();
  });

  it('should throw when listing has no VIN', async () => {
    mockListingRepo.findById.mockResolvedValue({ ...mockListing, vin: null });
    await expect(useCase.execute(listingId)).rejects.toThrow();
  });

  it('should throw when INFOCAR_SECRET_KEY is not set', async () => {
    mockConfigService.get.mockReturnValue(undefined);
    await expect(useCase.execute(listingId)).rejects.toThrow();
  });
});
