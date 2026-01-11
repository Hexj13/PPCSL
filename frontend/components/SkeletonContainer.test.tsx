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

  it('should show children after delay when isLoading=true (default behavior)', () => {
    render(
      <SkeletonContainer isLoading={true}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should show children immediately when immediate=true', () => {
    render(
      <SkeletonContainer isLoading={true} immediate={true} showDelay={0}>
        <div data-testid="skeleton">Skeleton content</div>
      </SkeletonContainer>
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should hide children when isLoading=false after minDisplayTime', () => {
    const { rerender } = render(
      <SkeletonContainer isLoading={true} minDisplayTime={1000} immediate={true} showDelay={0}>
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
