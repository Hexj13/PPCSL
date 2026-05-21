import { render } from '@testing-library/react';

import { ScrollSnapDualPicker } from './ScrollSnapDualPicker';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.rangeDash' ? '—' : key),
  }),
}));

describe('ScrollSnapDualPicker', () => {
  it('renders from and to wheels side by side in one row', () => {
    const { container } = render(
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

    const pickerRow = container.querySelector('.flex.flex-row.items-center.gap-x-2');
    expect(pickerRow).not.toBeNull();
    expect(pickerRow?.querySelectorAll('[role="listbox"]')).toHaveLength(2);
  });
});
