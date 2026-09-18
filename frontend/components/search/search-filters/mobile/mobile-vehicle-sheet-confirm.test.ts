import { runVehicleSheetConfirm } from './mobile-vehicle-sheet-confirm';

function createDeps() {
  return {
    dismissSheet: jest.fn(),
    onMultiSelectChange: jest.fn(),
    onFilterChange: jest.fn(),
    onYearBlur: jest.fn(),
    onPriceBlur: jest.fn(),
    handleMileageBlur: jest.fn(),
    handleEngineBlur: jest.fn(),
    handleHorsepowerBlur: jest.fn(),
  };
}

describe('runVehicleSheetConfirm', () => {
  it('returns the applied patch for a multi-select sheet', () => {
    const deps = createDeps();
    const patch = runVehicleSheetConfirm('vehicle_fuel', { fuels: ['Petrol'] }, deps);

    expect(deps.onMultiSelectChange).toHaveBeenCalledWith('fuels', ['Petrol']);
    expect(deps.dismissSheet).toHaveBeenCalledTimes(1);
    expect(patch).toEqual({ fuels: ['Petrol'] });
  });

  it('returns an empty patch and does not apply values when the sheet is missing', () => {
    const deps = createDeps();
    const patch = runVehicleSheetConfirm(null, { fuels: ['Petrol'] }, deps);

    expect(deps.onMultiSelectChange).not.toHaveBeenCalled();
    expect(deps.dismissSheet).toHaveBeenCalledTimes(1);
    expect(patch).toEqual({});
  });

  it('returns a swapped mileage patch when from is greater than to', () => {
    const deps = createDeps();
    const patch = runVehicleSheetConfirm(
      'vehicle_mileage',
      { mileage_gte: '150000', mileage_lte: '50000' },
      deps,
    );

    expect(patch).toEqual({ mileage_gte: '50000', mileage_lte: '150000' });
    expect(deps.onFilterChange).toHaveBeenCalledWith('mileage_gte', '50000');
    expect(deps.onFilterChange).toHaveBeenCalledWith('mileage_lte', '150000');
  });

  it('returns a swapped price patch when from is greater than to', () => {
    const deps = createDeps();
    const patch = runVehicleSheetConfirm(
      'vehicle_price',
      { price_gte: '8000', price_lte: '2000' },
      deps,
    );

    expect(patch).toEqual({ price_gte: '2000', price_lte: '8000' });
    expect(deps.onFilterChange).toHaveBeenCalledWith('price_gte', '2000');
    expect(deps.onFilterChange).toHaveBeenCalledWith('price_lte', '8000');
  });
});
