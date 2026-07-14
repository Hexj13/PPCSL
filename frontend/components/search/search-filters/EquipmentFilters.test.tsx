import { fireEvent, render, screen } from '@testing-library/react';

import { EquipmentFilters } from './EquipmentFilters';

describe('EquipmentFilters', () => {
  const defaultProps = {
    equipment: [] as string[],
    equipmentMatchMode: 'partial' as const,
    onEquipmentMatchModeChange: jest.fn(),
    onChange: jest.fn(),
    vehicleType: 'car' as const,
    enableE2eTestIds: true,
  };

  it('opens the first equipment category by default and keeps the rest collapsed', () => {
    render(<EquipmentFilters {...defaultProps} />);

    const comfortToggle = screen.getByTestId('search-equipment-category-comfort-toggle');
    const multimediaToggle = screen.getByTestId('search-equipment-category-multimedia-toggle');
    const comfortContent = screen.getByTestId('search-equipment-category-comfort-content');
    const multimediaContent = screen.getByTestId('search-equipment-category-multimedia-content');

    expect(comfortToggle).toHaveAttribute('aria-expanded', 'true');
    expect(multimediaToggle).toHaveAttribute('aria-expanded', 'false');
    expect(comfortContent).toHaveClass('grid-rows-[1fr]');
    expect(multimediaContent).toHaveClass('grid-rows-[0fr]');
  });

  it('toggles equipment category sections open and closed', () => {
    render(<EquipmentFilters {...defaultProps} />);

    const comfortToggle = screen.getByTestId('search-equipment-category-comfort-toggle');
    const multimediaToggle = screen.getByTestId('search-equipment-category-multimedia-toggle');
    const comfortContent = screen.getByTestId('search-equipment-category-comfort-content');
    const multimediaContent = screen.getByTestId('search-equipment-category-multimedia-content');

    fireEvent.click(multimediaToggle);

    expect(multimediaToggle).toHaveAttribute('aria-expanded', 'true');
    expect(multimediaContent).toHaveClass('grid-rows-[1fr]');
    expect(comfortToggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(comfortToggle);

    expect(comfortToggle).toHaveAttribute('aria-expanded', 'false');
    expect(comfortContent).toHaveClass('grid-rows-[0fr]');
  });

  it('calls onChange when a checkbox in the open category is toggled', () => {
    const onChange = jest.fn();
    render(<EquipmentFilters {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('search-equipment-air_conditioning'));

    expect(onChange).toHaveBeenCalledWith(['air_conditioning']);
  });
});
