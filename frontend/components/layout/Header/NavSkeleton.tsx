'use client';

type NavSkeletonProps = {
  variant: 'desktopLinks' | 'desktopActions' | 'desktopSignGuest' | 'mobile' | 'mobileSignGuest';
};

export function NavSkeleton({ variant }: NavSkeletonProps) {
  if (variant === 'desktopLinks') {
    return (
      <div className="flex gap-2 xl:gap-4 items-center">
        <div className="h-9 w-28 bg-primary-700/20 rounded-sm animate-pulse" />
        <div className="h-9 w-24 bg-primary-700/20 rounded-sm animate-pulse" />
        <div className="h-9 w-20 bg-primary-700/20 rounded-sm animate-pulse" />
      </div>
    );
  }
  if (variant === 'desktopActions') {
    return (
      <div className="flex gap-2 xl:gap-4 items-center">
        <div className="h-9 w-24 bg-primary-700/20 rounded-sm animate-pulse" />
        <div className="h-6 w-px bg-primary-700/20 shrink-0" />
        <div className="h-10 w-44 bg-primary-700/20 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-primary-700/20 rounded-lg animate-pulse" />
        <div className="h-6 w-px bg-primary-700/20 shrink-0" />
        <div className="h-10 w-28 bg-primary-700/20 rounded-lg animate-pulse" />
      </div>
    );
  }
  if (variant === 'desktopSignGuest') {
    return (
      <div className="h-10 w-28 bg-primary-700/20 rounded-lg animate-pulse shrink-0" aria-hidden />
    );
  }
  if (variant === 'mobileSignGuest') {
    return (
      <div
        className="h-[52px] w-28 bg-primary-700/20 rounded-lg animate-pulse shrink-0"
        aria-hidden
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 bg-white/20 rounded-sm animate-pulse" />
      <div className="h-10 bg-white/20 rounded-sm animate-pulse" />
    </div>
  );
}
