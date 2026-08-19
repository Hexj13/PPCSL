import { fireEvent, render, screen } from '@testing-library/react';

import { VehicleTypeSelector } from './VehicleTypeSelector';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/useTabIndicator', () => ({
  useTabIndicator: () => ({
    indicatorRef: { current: null },
    indicatorStyle: { left: 0, width: 64 },
  }),
}));

jest.mock('@/ui', () => ({
  CarIcon: () => <span data-testid="car-icon" />,
  TruckIcon: () => <span data-testid="truck-icon" />,
  MotoIcon: () => <span data-testid="moto-icon" />,
  TireCategoryIcon: () => <span data-testid="tire-icon" />,
}));

describe('VehicleTypeSelector', () => {
  it('calls onVehicleTypeChange when switching from car to truck', () => {
    const onVehicleTypeChange = jest.fn();
    render(
      <VehicleTypeSelector
        listingCategory="vehicle"
        vehicleType="car"
        onVehicleTypeChange={onVehicleTypeChange}
        onTireCategorySelect={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('search-vehicle-type-truck'));
    expect(onVehicleTypeChange).toHaveBeenCalledWith('truck');
  });

  it('does not call handler when clicking the already active vehicle type', () => {
    const onVehicleTypeChange = jest.fn();
    render(
      <VehicleTypeSelector
        listingCategory="vehicle"
        vehicleType="car"
        onVehicleTypeChange={onVehicleTypeChange}
        onTireCategorySelect={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('search-vehicle-type-car'));
    expect(onVehicleTypeChange).not.toHaveBeenCalled();
  });

  it('blocks clicks while switchingLocked is true', () => {
    const onVehicleTypeChange = jest.fn();
    const onTireCategorySelect = jest.fn();
    render(
      <VehicleTypeSelector
        listingCategory="vehicle"
        vehicleType="car"
        onVehicleTypeChange={onVehicleTypeChange}
        onTireCategorySelect={onTireCategorySelect}
        switchingLocked
      />,
    );

    fireEvent.click(screen.getByTestId('search-vehicle-type-truck'));
    fireEvent.click(screen.getByTestId('search-listing-category-tire'));
    expect(onVehicleTypeChange).not.toHaveBeenCalled();
    expect(onTireCategorySelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('search-vehicle-type-truck')).toBeDisabled();
    expect(screen.getByTestId('search-listing-category-tire')).toBeDisabled();
  });

  it('vertically centers the category label next to the type icons', () => {
    render(
      <VehicleTypeSelector
        listingCategory="vehicle"
        vehicleType="car"
        onVehicleTypeChange={jest.fn()}
        onTireCategorySelect={jest.fn()}
      />,
    );

    expect(screen.getByText('searchFilters.categoryLabel')).toHaveClass('lg:flex', 'items-center');
    expect(screen.getByText('searchFilters.categoryLabel')).not.toHaveClass('lg:inline');
  });

  it('calls onTireCategorySelect when tire tab is clicked from vehicle mode', () => {
    const onTireCategorySelect = jest.fn();
    render(
      <VehicleTypeSelector
        listingCategory="vehicle"
        vehicleType="car"
        onVehicleTypeChange={jest.fn()}
        onTireCategorySelect={onTireCategorySelect}
      />,
    );

    fireEvent.click(screen.getByTestId('search-listing-category-tire'));
    expect(onTireCategorySelect).toHaveBeenCalledTimes(1);
  });
});
