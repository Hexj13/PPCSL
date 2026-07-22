import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';

export default function MyListingsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <ListingManagementCardSkeleton key={index} />
      ))}
    </div>
  );
}
