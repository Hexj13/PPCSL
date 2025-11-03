interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
}

export function EmptyState({ message, actionLabel, actionHref, actionOnClick, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-gray-300 text-lg mb-4">{message}</p>
      {actionLabel && (
        <>
          {actionHref ? (
            <a href={actionHref} className="btn-primary inline-block">
              {actionLabel}
            </a>
          ) : actionOnClick ? (
            <button onClick={actionOnClick} className="btn-primary inline-block">
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
