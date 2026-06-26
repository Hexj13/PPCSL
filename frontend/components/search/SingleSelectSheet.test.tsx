import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { SingleSelectSheetContent } from './search-filters/mobile/sheets/SingleSelectSheet';

const sellerOptions = [
  { value: 'Individual', label: 'Individual' },
  { value: 'Business', label: 'Business' },
];

function ControlledSingleSelectSheet() {
  const [value, setValue] = useState('');

  return <SingleSelectSheetContent options={sellerOptions} value={value} onChange={setValue} />;
}

describe('SingleSelectSheetContent', () => {
  it('disables other options until the selected option is cleared', () => {
    render(<ControlledSingleSelectSheet />);

    const individualOption = screen.getByRole('button', { name: 'Individual' });
    const businessOption = screen.getByRole('button', { name: 'Business' });

    fireEvent.click(individualOption);

    expect(individualOption).not.toBeDisabled();
    expect(businessOption).toBeDisabled();

    fireEvent.click(individualOption);

    expect(individualOption).not.toBeDisabled();
    expect(businessOption).not.toBeDisabled();
  });
});
