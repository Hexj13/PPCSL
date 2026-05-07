import { render, screen } from '@testing-library/react';

import { MultiSelectOptionLeadingLogo } from './MultiSelectOptionLeadingLogo';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => <img data-testid="brand-logo" src={src} alt="" />,
}));

describe('MultiSelectOptionLeadingLogo', () => {
  it('renders nothing when src is missing', () => {
    const { container } = render(<MultiSelectOptionLeadingLogo />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders image when src is provided', () => {
    render(<MultiSelectOptionLeadingLogo src="/logo.png" />);
    expect(screen.getByTestId('brand-logo')).toHaveAttribute('src', '/logo.png');
  });
});
