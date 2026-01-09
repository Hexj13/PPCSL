import { ReactNode } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';

interface SkeletonContainerProps {
  isLoading: boolean;
  children: ReactNode;
  minDisplayTime?: number;
}

export function SkeletonContainer({
  isLoading,
  children,
  minDisplayTime = 1000,
}: SkeletonContainerProps) {
  const { visible: showSkeleton } = useLoadingState({
    isLoading,
    immediate: true,
    showDelay: 0,
    minDisplayTime,
  });

  if (!showSkeleton) {
    return null;
  }

  return <>{children}</>;
}
