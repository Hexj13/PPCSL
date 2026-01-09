import { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  inline?: boolean;
}

export function Spinner({
  size = 'md',
  text,
  className = '',
  inline = false,
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const containerClasses = inline ? 'inline-flex items-center gap-2' : 'text-center py-12';

  return (
    <div className={`${containerClasses} ${className}`} {...props}>
      <div
        className={`inline-block animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`}
      />
      {text && (
        <p className={`${inline ? '' : 'mt-4 '}text-gray-300 ${textSizeClasses[size]}`}>{text}</p>
      )}
    </div>
  );
}
