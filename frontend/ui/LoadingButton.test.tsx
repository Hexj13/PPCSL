import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoadingButton } from './LoadingButton';

jest.useFakeTimers();

describe('LoadingButton', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('should render children when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should show spinner when loading', async () => {
    const { rerender } = render(<LoadingButton loading={false}>Click me</LoadingButton>);

    rerender(<LoadingButton loading={true}>Click me</LoadingButton>);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      const button = screen.getByRole('button');
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByText('Click me')).not.toBeInTheDocument();
    });
  });

  it('should not change dimensions when toggling loading state', () => {
    const { container, rerender } = render(<LoadingButton loading={false}>Click me</LoadingButton>);

    const initialHeight = container.firstChild?.getBoundingClientRect().height;

    rerender(<LoadingButton loading={true}>Click me</LoadingButton>);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    const loadingHeight = container.firstChild?.getBoundingClientRect().height;

    expect(loadingHeight).toBe(initialHeight);
  });

  it('should block repeated clicks during loading', () => {
    const handleClick = jest.fn();
    const { rerender } = render(
      <LoadingButton loading={false} onClick={handleClick}>
        Click me
      </LoadingButton>
    );

    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <LoadingButton loading={true} onClick={handleClick}>
        Click me
      </LoadingButton>
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply disabled prop', () => {
    render(<LoadingButton disabled>Click me</LoadingButton>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
