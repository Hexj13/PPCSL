import { fireEvent, render, screen } from '@testing-library/react';

import { MultiSelectDropdown } from './MultiSelectDropdown';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'common.choose') return 'Choose';
      if (key === 'common.selectedCount') return `Selected ${params?.count ?? 0}`;
      if (key === 'common.ok') return 'OK';
      if (key === 'common.reset') return 'Reset';
      if (key === 'searchFilters.noResults') return 'No results';
      return key;
    },
  }),
}));

describe('MultiSelectDropdown', () => {
  it('shows selection counter and blocks selecting above max', () => {
    const onChange = jest.fn();
    const onSelectionLimitReached = jest.fn();

    render(
      <MultiSelectDropdown
        values={[]}
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ]}
        showActionButtons={true}
        maxSelection={2}
        onSelectionLimitReached={onSelectionLimitReached}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('0/2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByText('2/2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onSelectionLimitReached).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('renders floating field label and selected count inside the trigger', () => {
    const { rerender } = render(
      <MultiSelectDropdown
        values={[]}
        onChange={jest.fn()}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        fieldLabel="Body"
        showActionButtons={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Body' })).toBeInTheDocument();
    expect(screen.queryByText('Selected 2')).not.toBeInTheDocument();

    rerender(
      <MultiSelectDropdown
        values={['a', 'b']}
        onChange={jest.fn()}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        fieldLabel="Body"
        showActionButtons={true}
      />,
    );

    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Selected 2')).toBeInTheDocument();
  });
});
