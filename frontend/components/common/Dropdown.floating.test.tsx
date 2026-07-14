import { fireEvent, render, screen } from '@testing-library/react';

import { Dropdown } from './Dropdown';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'searchFilters.noResults') return 'No results';
      if (key === 'common.reset') return 'Reset';
      if (key === 'common.ok') return 'OK';
      return key;
    },
  }),
}));

describe('Dropdown floating label', () => {
  it('keeps the field label inside the trigger and shows the selected value below it', () => {
    const { rerender } = render(
      <Dropdown
        value=""
        onChange={jest.fn()}
        options={[
          { value: '2018', label: '2018' },
          { value: '2019', label: '2019' },
        ]}
        fieldLabel="Year from"
        placeholder="From"
      />,
    );

    expect(screen.getByRole('button', { name: 'Year from' })).toBeInTheDocument();
    expect(screen.queryByText('2018')).not.toBeInTheDocument();

    rerender(
      <Dropdown
        value="2018"
        onChange={jest.fn()}
        options={[
          { value: '2018', label: '2018' },
          { value: '2019', label: '2019' },
        ]}
        fieldLabel="Year from"
        placeholder="From"
      />,
    );

    expect(screen.getByText('Year from')).toBeInTheDocument();
    expect(screen.getByText('2018')).toBeInTheDocument();
  });

  it('does not float the label on open alone, only when searching or selected', () => {
    const { rerender } = render(
      <Dropdown
        value=""
        onChange={jest.fn()}
        options={[{ value: '2018', label: '2018' }]}
        fieldLabel="Year from"
        searchable
        placeholder="From"
      />,
    );

    const input = screen.getByLabelText('Year from');
    fireEvent.focus(input);
    expect(screen.getByTitle('Year from')).not.toHaveClass('is-floating');

    fireEvent.change(input, { target: { value: '20' } });
    expect(screen.getByTitle('Year from')).toHaveClass('is-floating');
    expect(input).toHaveValue('20');

    rerender(
      <Dropdown
        value="2018"
        onChange={jest.fn()}
        options={[{ value: '2018', label: '2018' }]}
        fieldLabel="Year from"
        searchable
        placeholder="From"
      />,
    );
    expect(screen.getByTitle('Year from')).toHaveClass('is-floating');
  });
});
