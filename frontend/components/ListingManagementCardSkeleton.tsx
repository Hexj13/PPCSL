export function ListingManagementCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-0 md:gap-6 md:items-stretch">
        <div className="relative w-full h-[300px] md:h-full md:min-h-[320px] bg-bg-darker animate-pulse rounded-t-xl md:rounded-l-xl md:rounded-t-none md:rounded-b-none" />
        <div className="flex-1 p-5 flex flex-col">
          <div className="mb-3">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="h-3 bg-bg-light/30 rounded mb-2 w-32 animate-pulse" />
                <div className="h-6 bg-bg-light/40 rounded mb-1.5 w-3/4 animate-pulse" />
              </div>
              <div className="h-8 bg-bg-light/30 rounded w-24 animate-pulse" />
            </div>
            <div className="mb-2">
              <div className="h-8 bg-bg-light/40 rounded w-40 animate-pulse" />
            </div>
          </div>
          <div className="mb-3 flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5">
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
              <div className="h-5 bg-bg-light/30 rounded w-full animate-pulse" />
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-primary-500/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="h-4 bg-bg-light/30 rounded w-24 animate-pulse" />
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <div className="h-8 bg-bg-light/30 rounded w-32 animate-pulse" />
                <div className="h-8 bg-bg-light/30 rounded w-28 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

