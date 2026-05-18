import { fireEvent, render, screen } from '@testing-library/react';

import { FilterRow } from './FilterRow';

describe('FilterRow', () => {
  it('shows the label and value summary and calls onClick', () => {
    const onClick = jest.fn();
    render(<FilterRow label="Make" valueSummary="BMW" placeholder="Select" onClick={onClick} />);
    expect(screen.getByText('Make')).toBeInTheDocument();
    expect(screen.getByText('BMW')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
