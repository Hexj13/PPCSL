import type { HTMLAttributes, ReactNode } from 'react';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  gradient?: boolean;
}

export function Heading({
  children,
  level = 1,
  gradient = false,
  className = '',
  ...props
}: HeadingProps) {
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  const sizeClasses = {
    1: 'text-4xl md:text-5xl font-extrabold',
    2: 'text-3xl md:text-4xl font-bold',
    3: 'text-2xl md:text-3xl font-bold',
    4: 'text-xl md:text-2xl font-semibold',
    5: 'text-lg md:text-xl font-semibold',
    6: 'text-base md:text-lg font-semibold',
  };

  const gradientClasses = gradient
    ? 'bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent'
    : 'text-text-primary';

  return (
    <Component className={`${sizeClasses[level]} ${gradientClasses} ${className}`} {...props}>
      {children}
    </Component>
  );
}
