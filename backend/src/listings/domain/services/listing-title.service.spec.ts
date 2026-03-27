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

  it('should build tire title without model', () => {
    const title = service.generateForTire({
      brandName: 'Michelin',
      modelName: null,
      width_mm: 205,
      aspect_ratio: 55,
      diameter_inch: 16,
      load_index: '91',
      speed_index: 'V',
    });
    expect(title).toBe('Michelin 205/55 R16 91V');
  });

  it('should build tire title with model and load/speed marking', () => {
    const title = service.generateForTire({
      brandName: 'Pirelli',
      modelName: 'Contra',
      isOtherModel: false,
      customModelName: null,
      width_mm: 205,
      aspect_ratio: 55,
      diameter_inch: 16,
      load_index: '91',
      speed_index: 'v',
    });
    expect(title).toBe('Pirelli Contra 205/55 R16 91V');
  });

  it('should build tire title with marking only when load and speed omitted', () => {
    const title = service.generateForTire({
      brandName: 'Michelin',
      modelName: 'Pilot Sport',
      isOtherModel: false,
      customModelName: null,
      width_mm: 255,
      aspect_ratio: 40,
      diameter_inch: 20,
    });
    expect(title).toBe('Michelin Pilot Sport 255/40 R20');
  });
});
