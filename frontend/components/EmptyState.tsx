interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
}

export function EmptyState({
  message,
  actionLabel,
  actionHref,
  actionOnClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-gray-300 text-lg mb-4">{message}</p>
      {actionLabel && (
        <>
          {actionHref ? (
            <a
              href={actionHref}
              className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20 inline-block"
            >
              {actionLabel}
            </a>
          ) : actionOnClick ? (
            <button
              onClick={actionOnClick}
              className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20 inline-block"
            >
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
