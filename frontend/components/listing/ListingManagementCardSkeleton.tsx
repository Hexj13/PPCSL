export function ListingManagementCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-0 lg:gap-6 lg:items-stretch">
        <div className="relative w-full h-[300px] lg:h-full lg:min-h-[250px] bg-bg-darker animate-pulse rounded-t-xl lg:rounded-tl-xl lg:rounded-bl-xl lg:rounded-tr-none lg:rounded-br-none" />
        <div className="flex-1 p-5 flex flex-col">
          <div className="mb-3 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-6">
            <div className="flex-1 min-w-0">
              <div className="h-3 bg-bg-secondary/30 rounded mb-2 w-32 animate-pulse" />
              <div className="h-6 bg-bg-secondary/40 rounded w-3/4 mb-3 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-5 bg-bg-secondary/30 rounded w-full animate-pulse" />
                <div className="h-5 bg-bg-secondary/30 rounded w-full animate-pulse" />
                <div className="h-5 bg-bg-secondary/30 rounded w-full animate-pulse" />
                <div className="h-5 bg-bg-secondary/30 rounded w-full animate-pulse" />
                <div className="h-5 bg-bg-secondary/30 rounded w-full animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-end w-28">
              <div className="h-6 bg-bg-secondary/40 rounded w-full mb-3 animate-pulse" />
              <div className="flex gap-2 flex-wrap justify-end">
                <div className="h-8 bg-bg-secondary/40 rounded w-28 animate-pulse" />
                <div className="h-8 bg-bg-secondary/40 rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-primary-500/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="h-4 bg-bg-secondary/30 rounded w-24 animate-pulse" />
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <div className="h-8 bg-bg-secondary/30 rounded w-32 animate-pulse" />
                <div className="h-8 bg-bg-secondary/30 rounded w-28 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
