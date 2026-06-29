import { render, screen, within } from '@testing-library/react';

import { ScrollSnapDualPicker } from './ScrollSnapDualPicker';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.rangeDash' ? '—' : key),
  }),
}));

describe('ScrollSnapDualPicker', () => {
  it('renders from and to wheels side by side in one row', () => {
    render(
      <ScrollSnapDualPicker
        fromLabel="From"
        toLabel="To"
        fromValue="2024"
        toValue="2026"
        onFromChange={() => {}}
        onToChange={() => {}}
        options={[
          { value: '2024', label: '2024' },
          { value: '2026', label: '2026' },
        ]}
        emptyOptionLabel=""
        showColumnLabels={false}
      />,
    );

    expect(screen.getAllByRole('listbox')).toHaveLength(2);
    expect(screen.getByRole('listbox', { name: 'From' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'To' })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows empty option only in From column when toIncludeEmptyOption is false', () => {
    render(
      <ScrollSnapDualPicker
        fromLabel="From"
        toLabel="To"
        fromValue=""
        toValue="2026"
        onFromChange={() => {}}
        onToChange={() => {}}
        options={[
          { value: '2024', label: '2024' },
          { value: '2026', label: '2026' },
        ]}
        emptyOptionLabel="Not selected"
        toIncludeEmptyOption={false}
        showColumnLabels={false}
      />,
    );

    const fromListbox = screen.getByRole('listbox', { name: 'From' });
    const toListbox = screen.getByRole('listbox', { name: 'To' });

    expect(within(fromListbox).getByRole('option', { name: 'Not selected' })).toBeInTheDocument();
    expect(
      within(toListbox).queryByRole('option', { name: 'Not selected' }),
    ).not.toBeInTheDocument();
  });

  it('excludes zero from From column when fromOptions omit it', () => {
    render(
      <ScrollSnapDualPicker
        fromLabel="From"
        toLabel="To"
        fromValue=""
        toValue="0"
        onFromChange={() => {}}
        onToChange={() => {}}
        options={[
          { value: '0', label: '0' },
          { value: '5000', label: '5 000' },
        ]}
        fromOptions={[{ value: '5000', label: '5 000' }]}
        emptyOptionLabel="Not selected"
        showColumnLabels={false}
      />,
    );

    const fromListbox = screen.getByRole('listbox', { name: 'From' });
    const toListbox = screen.getByRole('listbox', { name: 'To' });

    expect(within(fromListbox).queryByRole('option', { name: '0' })).not.toBeInTheDocument();
    expect(within(toListbox).getByRole('option', { name: '0' })).toBeInTheDocument();
  });
});
