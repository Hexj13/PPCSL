export function ListingCardSkeleton() {
  return (
    <div className="card overflow-hidden cursor-pointer h-full flex flex-col">
      <div
        className="relative w-full bg-bg-darker shrink-0 animate-pulse"
        style={{ aspectRatio: '16/9', minHeight: '240px' }}
      />
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
    </div>
  );
}
