import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';

export default function MyListingsLoading() {
  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="flex items-center space-x-2 text-sm mb-6 animate-pulse">
        <div className="h-4 bg-primary-500/10 rounded-sm w-20" />
        <span className="text-text-secondary">/</span>
        <div className="h-4 bg-primary-500/10 rounded-sm w-40" />
      </div>

      <div className="h-10 bg-primary-500/10 rounded-sm w-64 mb-6 md:mb-8 animate-pulse" />

      <div className="flex flex-col lg:flex-row gap-3 w-full mb-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-[48px] rounded-lg bg-primary-500/10 animate-pulse w-full lg:w-40"
          />
        ))}
      </div>

      <div className="border-t border-primary-500/20 pt-4">
        <div className="w-full h-[48px] md:h-[52px] rounded-lg bg-primary-500/10 animate-pulse mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
