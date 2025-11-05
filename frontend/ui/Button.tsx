import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'yellow' | 'green-dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-semibold rounded-lg transition-all duration-200 select-none text-center';

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:shadow-xl hover:from-primary-700 hover:to-primary-800 transform hover:-translate-y-0.5',
    secondary:
      'bg-bg-light border-2 border-primary-500/30 text-white hover:bg-bg-light/80 hover:border-primary-500',
    outline:
      'bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-500/10 hover:border-primary-400',
    yellow:
      'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl hover:from-yellow-600 hover:to-yellow-700 transform hover:-translate-y-0.5',
    'green-dark':
      'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-lg hover:shadow-xl hover:from-primary-800 hover:to-primary-900 transform hover:-translate-y-0.5',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 md:px-6 py-2.5 md:py-3',
    lg: 'px-6 md:px-8 py-3 md:py-4 text-lg',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed transform-none' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
