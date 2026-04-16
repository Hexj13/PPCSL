export default function AdminLoading() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div className="h-10 bg-primary-500/10 rounded-sm w-48 animate-pulse" />
      </div>

      <div className="mb-6 border-b border-primary-500/20">
        <div className="flex gap-1 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-primary-500/10 rounded-t-lg w-28 shrink-0" />
          ))}
        </div>
      </div>

      <div className="animate-pulse space-y-4">
        <div className="h-[48px] bg-primary-500/10 rounded-lg w-full" />
        <div className="h-[48px] bg-primary-500/10 rounded-lg w-full" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-primary-500/10 rounded-lg w-full" />
        ))}
      </div>
    </div>
  );
}
