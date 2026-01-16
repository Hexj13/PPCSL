import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'yellow' | 'green-dark';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
      'text-white font-semibold rounded-lg transition-all duration-200 select-none text-center border-none cursor-pointer hover:text-primary-100',
    secondary:
      'bg-bg-secondary border-2 border-primary-500/30 text-white hover:border-primary-500 hover:text-primary-100',
    outline:
      'bg-transparent border-2 border-primary-500 text-primary-500 hover:border-primary-400 hover:text-primary-400',
    yellow:
      'bg-gradient-to-r from-accent to-accent text-white shadow-lg hover:shadow-xl hover:text-accent/90',
    'green-dark':
      'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-lg hover:shadow-xl hover:text-primary-200',
  };

  const sizeClasses = {
    xs: 'px-3 py-1.5 text-sm',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 md:px-6 py-2.5 md:py-3',
    lg: 'px-6 md:px-8 py-3 md:py-4 text-lg',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed transform-none' : '';

  const primaryStyle =
    variant === 'primary'
      ? {
          backgroundColor: '#40916B',
          boxShadow:
            size === 'md' || size === 'lg'
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : undefined,
          ...(size === 'md' || size === 'lg'
            ? {
                height: '52px',
                minHeight: '52px',
                maxHeight: '52px',
                fontSize: '16px',
                fontWeight: 600,
              }
            : {}),
        }
      : {};

  const handleMouseEnter =
    variant === 'primary'
      ? (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!disabled && (size === 'md' || size === 'lg')) {
            e.currentTarget.style.boxShadow =
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          }
        }
      : undefined;

  const handleMouseLeave =
    variant === 'primary'
      ? (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!disabled && (size === 'md' || size === 'lg')) {
            e.currentTarget.style.boxShadow =
              '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }
        }
      : undefined;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabledClasses} ${className}`}
      style={primaryStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
