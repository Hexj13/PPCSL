import { act, render, screen } from '@testing-library/react';

import { SkeletonContainer } from './SkeletonContainer';

jest.useFakeTimers();

describe('SkeletonContainer', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('should show children immediately when isLoading=true', () => {
    render(
      <SkeletonContainer isLoading={true}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should hide children when isLoading=false after minDisplayTime', () => {
    const { rerender } = render(
      <SkeletonContainer isLoading={true} minDisplayTime={1000}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();

    rerender(
      <SkeletonContainer isLoading={false} minDisplayTime={1000}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });

  it('should not show children when isLoading=false from the start', () => {
    render(
      <SkeletonContainer isLoading={false}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });
});
