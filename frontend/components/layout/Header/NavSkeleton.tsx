'use client';

type NavSkeletonProps = {
  variant: 'desktop' | 'mobile';
};

export function NavSkeleton({ variant }: NavSkeletonProps) {
  if (variant === 'desktop') {
    return (
      <div className="flex gap-4 items-center">
        <div className="h-9 w-24 bg-white/20 rounded animate-pulse" />
        <div className="h-9 w-32 bg-white/20 rounded animate-pulse" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 bg-white/20 rounded animate-pulse" />
      <div className="h-10 bg-white/20 rounded animate-pulse" />
    </div>
  );
}
