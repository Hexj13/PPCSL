import React, { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const ListingCardSkeleton = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<'div'> & { variant?: 'default' | 'compact' }
>(function ListingCardSkeleton({ className, variant = 'default', ...props }, ref) {
  const isCompact = variant === 'compact';
  return (
    <div
      ref={ref}
      className={['card overflow-hidden cursor-pointer h-full flex flex-col', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div
        className="relative w-full bg-bg-darker shrink-0 animate-pulse"
        style={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: isCompact ? '4/3' : '16/9',
          minHeight: isCompact ? '0' : '240px',
        }}
      />
      {isCompact ? (
        <div className="p-3 flex-1 flex flex-col">
          <div className="h-4 bg-bg-secondary/40 rounded-sm mb-2 w-3/4 animate-pulse" />
          <div className="h-5 bg-bg-secondary/40 rounded-sm mb-2 w-1/2 animate-pulse" />
          <div className="h-3 bg-bg-secondary/30 rounded-sm w-2/3 animate-pulse" />
          <div className="flex justify-between items-center mt-auto pt-2 border-t border-primary-500/20">
            <div className="h-3 bg-bg-secondary/30 rounded-sm w-1/3 animate-pulse" />
            <div className="h-3 bg-bg-secondary/30 rounded-sm w-1/4 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-5 flex-1 flex flex-col">
          <div className="h-5 bg-bg-secondary/40 rounded-sm mb-2 w-3/4 animate-pulse" />
          <div className="h-7 bg-bg-secondary/40 rounded-sm mb-3 w-1/2 animate-pulse" />
          <div className="grow mb-3 space-y-1.5">
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-full animate-pulse" />
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-5/6 animate-pulse" />
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-4/6 animate-pulse" />
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-3/4 animate-pulse" />
          </div>
          <div className="flex justify-between items-center mt-auto pt-3 border-t border-primary-500/20">
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-1/3 animate-pulse" />
            <div className="h-4 bg-bg-secondary/30 rounded-sm w-1/4 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
});
