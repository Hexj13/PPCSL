import { fireEvent, render, screen } from '@testing-library/react';

import { SearchFilterInput } from './SearchFilterInput';

describe('SearchFilterInput', () => {
  it('floats the label on focus and when a value is present', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <SearchFilterInput value="" onChange={onChange} fieldLabel="Price from" />,
    );

    const input = screen.getByLabelText('Price from');
    expect(screen.getByTitle('Price from')).not.toHaveClass('is-floating');

    fireEvent.focus(input);
    expect(screen.getByTitle('Price from')).toHaveClass('is-floating');

    fireEvent.blur(input);
    expect(screen.getByTitle('Price from')).not.toHaveClass('is-floating');

    fireEvent.change(input, { target: { value: '1000' } });
    expect(onChange).toHaveBeenCalledWith('1000');

    rerender(<SearchFilterInput value="1000" onChange={onChange} fieldLabel="Price from" />);
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByTitle('Price from')).toHaveClass('is-floating');
  });

  it('renders paired from/to fields', () => {
    render(
      <>
        <SearchFilterInput value="1" onChange={jest.fn()} fieldLabel="From" paired="left" />
        <SearchFilterInput value="2" onChange={jest.fn()} fieldLabel="To" paired="right" />
      </>,
    );
    expect(screen.getByLabelText('From')).toHaveValue('1');
    expect(screen.getByLabelText('To')).toHaveValue('2');
  });

  it('renders trailing content in the floating label', () => {
    render(
      <SearchFilterInput
        value=""
        onChange={jest.fn()}
        fieldLabel="Brand"
        fieldLabelTrailing={<span data-testid="trailing">*</span>}
      />,
    );

    expect(screen.getByTestId('trailing')).toBeInTheDocument();
  });
});
