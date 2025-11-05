import { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function Spinner({ size = 'md', text, className = '', ...props }: SpinnerProps) {
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

  return (
    <div className={`text-center py-12 ${className}`} {...props}>
      <div
        className={`inline-block animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`}
      />
      {text && <p className={`mt-4 text-gray-300 ${textSizeClasses[size]}`}>{text}</p>}
    </div>
  );
}
