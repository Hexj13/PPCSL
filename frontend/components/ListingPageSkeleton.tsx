export function BreadcrumbsSkeleton() {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      <div className="h-4 bg-bg-light/30 rounded w-20 animate-pulse" />
      <span className="text-gray-500">/</span>
      <div className="h-4 bg-bg-light/30 rounded w-48 animate-pulse" />
    </nav>
  );
}

export function MainImageSkeleton() {
  return (
    <div className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 animate-pulse" />
  );
}

export function ThumbnailsSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="relative h-28 sm:h-32 bg-bg-darker rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export function PriceSkeleton() {
  return (
    <div className="flex items-baseline gap-3 flex-wrap mb-5">
      <div className="h-12 bg-bg-light/30 rounded w-48 animate-pulse" />
      <div className="h-6 bg-bg-light/30 rounded w-16 animate-pulse" />
    </div>
  );
}

export function FavoriteButtonSkeleton() {
  return <div className="w-full sm:w-auto h-12 bg-bg-light/30 rounded-lg animate-pulse" />;
}

export function InfoBlockSkeleton() {
  return (
    <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
      <div className="h-7 bg-bg-light/30 rounded w-40 mb-6 animate-pulse" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-bg-light/30 rounded w-20 animate-pulse" />
              <div className="h-4 bg-bg-light/30 rounded w-32 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-primary-500/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-bg-light/30 rounded w-20 animate-pulse" />
                <div className="h-4 bg-bg-light/30 rounded w-32 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TitleSkeleton() {
  return (
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6">
      <span className="inline-block h-10 bg-bg-light/30 rounded w-3/4 animate-pulse" />
    </h1>
  );
}

export function BadgesSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 bg-bg-light/30 rounded-lg w-24 animate-pulse" />
      <div className="h-8 bg-bg-light/30 rounded-lg w-20 animate-pulse" />
    </div>
  );
}
