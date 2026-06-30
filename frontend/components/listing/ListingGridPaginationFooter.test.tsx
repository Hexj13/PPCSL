/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

import { ListingGridPaginationFooter } from './ListingGridPaginationFooter';

describe('ListingGridPaginationFooter', () => {
  const defaultProps = {
    hasMore: true,
    loadingMore: false,
    onLoadMore: jest.fn(),
    loadMoreLabel: 'Show more',
    noMoreLabel: 'No more listings',
    showNoMore: false,
  };

  it('renders footer spacing container for load more state', () => {
    render(<ListingGridPaginationFooter {...defaultProps} />);

    const footer = screen.getByTestId('listing-grid-pagination-footer');
    expect(footer).toHaveClass('pt-6');
    expect(footer).toHaveClass('md:pt-8');
    expect(screen.getByTestId('listings-load-more')).toBeInTheDocument();
  });

  it('does not duplicate top padding on load more button wrapper', () => {
    render(<ListingGridPaginationFooter {...defaultProps} />);

    const wrapper = screen.getByTestId('listing-grid-load-more-wrapper');
    expect(wrapper).not.toHaveClass('pt-8');
  });

  it('renders footer spacing container for no more listings state', () => {
    render(
      <ListingGridPaginationFooter
        {...defaultProps}
        hasMore={false}
        showNoMore={true}
        loadMoreLabel="Show more"
      />,
    );

    const footer = screen.getByTestId('listing-grid-pagination-footer');
    const wrapper = screen.getByTestId('listing-grid-no-more-wrapper');
    expect(footer).toHaveClass('pt-6');
    expect(footer).toHaveClass('md:pt-8');
    expect(wrapper).not.toHaveClass('pt-8');
    expect(screen.getByText('No more listings')).toBeInTheDocument();
  });

  it('does not render spacing when there is no pagination state', () => {
    render(<ListingGridPaginationFooter {...defaultProps} hasMore={false} showNoMore={false} />);

    expect(screen.queryByTestId('listing-grid-pagination-footer')).not.toBeInTheDocument();
  });
});
