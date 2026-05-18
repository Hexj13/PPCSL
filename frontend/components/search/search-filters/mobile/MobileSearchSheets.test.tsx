import { fireEvent, render, screen } from '@testing-library/react';

import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'searchFilters.noResults') return 'No results';
      return key;
    },
  }),
}));

describe('MultiSelectSheetContent', () => {
  it('toggles a value and calls onChange', () => {
    const onChange = jest.fn();
    render(
      <MultiSelectSheetContent
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
        values={[]}
        onChange={onChange}
        searchable={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Option A' }));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });
});
