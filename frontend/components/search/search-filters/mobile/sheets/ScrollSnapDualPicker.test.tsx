import { render, screen } from '@testing-library/react';

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
});
