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
});
