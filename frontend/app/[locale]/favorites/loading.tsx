import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';

export default function FavoritesLoading() {
  return (
    <div>
      <div className="flex items-center space-x-2 text-sm mb-6 animate-pulse">
        <div className="h-4 bg-primary-500/10 rounded-sm w-20" />
        <span className="text-text-secondary">/</span>
        <div className="h-4 bg-primary-500/10 rounded-sm w-32" />
      </div>

      <div className="h-10 bg-primary-500/10 rounded-sm w-56 mb-6 md:mb-8 animate-pulse" />

      <div className="mb-6 border-b border-primary-500/20">
        <div className="flex gap-1 animate-pulse">
          <div className="h-12 bg-primary-500/10 rounded-t-lg w-32 shrink-0" />
          <div className="h-12 bg-primary-500/10 rounded-t-lg w-28 shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
