import { BrandModelResolver, ListingTitleService, VehicleForTitle } from './listing-title.service';

describe('ListingTitleService', () => {
  let service: ListingTitleService;
  let resolver: jest.Mocked<BrandModelResolver>;

  beforeEach(() => {
    service = new ListingTitleService();
    resolver = {
      getBrandName: jest.fn(),
      getModelName: jest.fn(),
      getModelVehicleType: jest.fn(),
      getTransmissionLabel: jest.fn(),
    };
  });

  it('should build title from brand, model, year', async () => {
    resolver.getBrandName.mockResolvedValue('Toyota');
    resolver.getModelName.mockResolvedValue('Camry');
    resolver.getModelVehicleType.mockResolvedValue('car');

    const vehicle: VehicleForTitle = {
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2020,
    };

    const title = await service.generate(vehicle, resolver);

    expect(title).toBe('Toyota Camry 2020');
    expect(resolver.getTransmissionLabel).not.toHaveBeenCalled();
  });

  it('should add transmission for car when available', async () => {
    resolver.getBrandName.mockResolvedValue('Toyota');
    resolver.getModelName.mockResolvedValue('Camry');
    resolver.getModelVehicleType.mockResolvedValue('car');
    resolver.getTransmissionLabel.mockResolvedValue('Automatic');

    const vehicle: VehicleForTitle = {
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2020,
      transmission: 'automatic',
    };

    const title = await service.generate(vehicle, resolver);

    expect(title).toBe('Toyota Camry 2020 (Automatic)');
    expect(resolver.getTransmissionLabel).toHaveBeenCalledWith(
      'vehicleOptions.transmission.automatic',
    );
  });

  it('should not add transmission for moto', async () => {
    resolver.getBrandName.mockResolvedValue('Honda');
    resolver.getModelName.mockResolvedValue('CBR');
    resolver.getModelVehicleType.mockResolvedValue('moto');

    const vehicle: VehicleForTitle = {
      brand_id: 'b',
      model_id: 'm',
      year: 2022,
      transmission: 'manual',
    };

    const title = await service.generate(vehicle, resolver);

    expect(title).toBe('Honda CBR 2022');
    expect(resolver.getTransmissionLabel).not.toHaveBeenCalled();
  });

  it('should return base title when transmission label not found', async () => {
    resolver.getBrandName.mockResolvedValue('Toyota');
    resolver.getModelName.mockResolvedValue('Camry');
    resolver.getModelVehicleType.mockResolvedValue('car');
    resolver.getTransmissionLabel.mockResolvedValue('vehicleOptions.transmission.manual');

    const vehicle: VehicleForTitle = {
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2020,
      transmission: 'manual',
    };

    const title = await service.generate(vehicle, resolver);

    expect(title).toBe('Toyota Camry 2020');
  });

  it('should handle missing brand and model', async () => {
    resolver.getBrandName.mockResolvedValue(null);
    resolver.getModelName.mockResolvedValue(null);
    resolver.getModelVehicleType.mockResolvedValue(null);

    const vehicle: VehicleForTitle = {
      brand_id: 'brand-1',
      model_id: 'model-1',
      year: 2019,
    };

    const title = await service.generate(vehicle, resolver);

    expect(title).toBe('2019');
  });
});
