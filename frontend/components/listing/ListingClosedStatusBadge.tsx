'use client';

export function ListingClosedStatusBadge({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-gray-500/40 text-gray-700 shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-gray-500/10 before:pointer-events-none ${className}`}
    >
      <svg
        className="relative z-10 w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span className="relative z-10">{label}</span>
    </span>
  );
}
