import { render, screen } from '@testing-library/react';

import { PromotionModal } from './PromotionModal';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en', translations: {}, isLoading: false }),
}));

describe('PromotionModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <PromotionModal isOpen={false} onClose={jest.fn()} onSelect={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dialog when open', () => {
    render(<PromotionModal isOpen={true} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
