import { render, screen } from '@testing-library/react';
import React from 'react';

import { PriceDisplay } from './PriceDisplay';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { price?: string; currency?: string }) => {
      if (key === 'listings.urgent') return 'Urgent';
      if (key === 'listings.approxPriceWithCurrency' && opts)
        return `(≈ ${opts.price} ${opts.currency})`;
      return key;
    },
  }),
}));

describe('PriceDisplay', () => {
  it('should render main price and currency', () => {
    render(<PriceDisplay price={12500} currency="MDL" />);
    expect(screen.getByText('12 500')).toBeInTheDocument();
    expect(screen.getByText('MDL')).toBeInTheDocument();
  });

  it('should display ALL currency as LEK', () => {
    render(<PriceDisplay price={250000} currency="ALL" />);
    expect(screen.getByText('250 000')).toBeInTheDocument();
    expect(screen.getByText('LEK')).toBeInTheDocument();
    expect(screen.queryByText('ALL')).not.toBeInTheDocument();
  });

  it('should show approx price when approxPrice and defaultCurrencyCode are provided', () => {
    render(
      <PriceDisplay price={12500} currency="MDL" approxPrice={650} defaultCurrencyCode="EUR" />,
    );
    expect(screen.getByText('12 500')).toBeInTheDocument();
    expect(screen.getByText('MDL')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '(≈ 650 EUR)')).toBeInTheDocument();
  });

  it('should not show approx price when approxPrice is null', () => {
    render(
      <PriceDisplay price={12500} currency="MDL" approxPrice={null} defaultCurrencyCode="EUR" />,
    );
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it('should not show approx price when defaultCurrencyCode is missing', () => {
    render(<PriceDisplay price={12500} currency="MDL" approxPrice={650} />);
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it('should show urgent badge when urgent is true', () => {
    render(<PriceDisplay price={1000} currency="EUR" urgent />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });
});
