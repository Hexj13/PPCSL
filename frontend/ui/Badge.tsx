import { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const variantClasses = {
    primary: 'bg-primary-500/20 text-primary-400 border-primary-500/40',
    success: 'bg-green-500/20 text-green-400 border-green-500/40',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    error: 'bg-red-500/20 text-red-400 border-red-500/40',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    neutral: 'bg-gray-500/20 text-gray-200 border-gray-500/40',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
