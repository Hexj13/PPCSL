import { fireEvent, render, screen } from '@testing-library/react';

import { PopularFilterBrandTile, PopularFilterChip } from './PopularFilterPickers';

describe('PopularFilterPickers', () => {
  it('toggles chip selection semantics', () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <PopularFilterChip label="BMW X5" selected={false} onToggle={onToggle} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'BMW X5' }));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<PopularFilterChip label="BMW X5" selected onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'BMW X5' }).className).toContain('is-selected');
  });

  it('exposes selected state on brand tiles', () => {
    render(
      <PopularFilterBrandTile
        label="BMW"
        selected
        onToggle={jest.fn()}
        letterPlaceholder
        listingCount={12}
      />,
    );

    expect(screen.getByRole('button', { name: 'BMW, selected, 12' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'BMW, selected, 12' }).className).toContain(
      'is-selected',
    );
  });
});
