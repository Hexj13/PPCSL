import { ReactNode } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';

interface SkeletonContainerProps {
  isLoading: boolean;
  children: ReactNode;
  minDisplayTime?: number;
  immediate?: boolean;
  showDelay?: number;
}

export function SkeletonContainer({
  isLoading,
  children,
  minDisplayTime = 1000,
  immediate = false,
  showDelay = 200,
}: SkeletonContainerProps) {
  const { visible: showSkeleton } = useLoadingState({
    isLoading,
    immediate,
    showDelay,
    minDisplayTime,
  });

  if (!showSkeleton) {
    return null;
  }

  return <>{children}</>;
}
