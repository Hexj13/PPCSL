import type { ButtonHTMLAttributes, ReactNode } from 'react';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface AdminFilterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  badge?: ReactNode;
}

export function AdminFilterButton({
  active = false,
  className,
  children,
  badge,
  type = 'button',
  ...props
}: AdminFilterButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        'px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors border-2',
        active
          ? 'bg-primary-500/10 border-primary-700 text-primary-700'
          : 'bg-bg-secondary border-primary-700 text-primary-700 hover-only:hover:bg-bg-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900',
        className,
      )}
      {...props}
    >
      {children}
      {badge ? (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-sm">{badge}</span>
      ) : null}
    </button>
  );
}

interface AdminActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export function AdminActionButton({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...props
}: AdminActionButtonProps) {
  const variantClasses = {
    primary:
      'border-primary-700 bg-primary-500/10 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900',
    secondary:
      'border-gray-500/40 bg-gray-500/20 text-text-secondary hover-only:hover:border-gray-500/60 hover-only:hover:text-text-primary active:text-text-primary',
    danger:
      'border-red-600/60 bg-red-500/10 text-red-700 hover-only:hover:border-red-700 hover-only:hover:text-red-800 active:text-red-800 active:border-red-700',
  } as const;

  return (
    <button
      type={type}
      className={joinClasses(
        'shrink-0 font-medium text-base transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 h-[48px] rounded-lg border-2 select-none disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
