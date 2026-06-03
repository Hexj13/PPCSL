import { fireEvent, render, screen } from '@testing-library/react';

import { ListingPhotoCarouselNavButtons } from './ListingPhotoCarouselNavButtons';

describe('ListingPhotoCarouselNavButtons', () => {
  it('renders disabled buttons that do not invoke handlers', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    render(
      <ListingPhotoCarouselNavButtons
        variant="card"
        disabled
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Previous photo"
        nextLabel="Next photo"
      />,
    );

    const prev = screen.getByLabelText('Previous photo');
    const next = screen.getByLabelText('Next photo');
    expect(prev).toBeDisabled();
    expect(next).toBeDisabled();

    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('invokes handlers when enabled', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    render(
      <ListingPhotoCarouselNavButtons
        variant="card"
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Previous photo"
        nextLabel="Next photo"
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous photo'));
    fireEvent.click(screen.getByLabelText('Next photo'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
