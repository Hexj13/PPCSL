'use client';

interface ListingFormSkeletonProps {
  isVisible: boolean;
}

export function ListingFormSkeleton({ isVisible }: ListingFormSkeletonProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white z-40 p-4 md:p-6 lg:p-8 rounded-xl transition-opacity duration-300 opacity-100">
      <div className="animate-pulse">
        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="h-8 bg-gray-200 rounded-sm w-48 mb-4" />
          <div className="flex gap-2">
            <div className="h-14 flex-1 bg-gray-200 rounded-lg" />
            <div className="h-14 flex-1 bg-gray-200 rounded-lg" />
            <div className="h-14 flex-1 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded-sm w-56 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-12 bg-gray-200 rounded-sm" />
            <div className="h-12 bg-gray-200 rounded-sm" />
            <div className="h-12 bg-gray-200 rounded-sm" />
            <div className="h-12 bg-gray-200 rounded-sm" />
          </div>
          <div className="h-8 bg-gray-200 rounded-sm w-48 mt-6 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-12 bg-gray-200 rounded-sm" />
            <div className="h-12 bg-gray-200 rounded-sm" />
          </div>
          <div className="h-8 bg-gray-200 rounded-sm w-40 mt-6 mb-4" />
          <div className="h-32 bg-gray-200 rounded-sm" />
          <div className="h-12 bg-gray-200 rounded-sm w-full mt-6" />
        </div>
      </div>
    </div>
  );
}
