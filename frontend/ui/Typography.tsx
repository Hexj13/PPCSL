import type { HTMLAttributes, ReactNode } from 'react';

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: 'body' | 'small' | 'caption';
  as?: 'p' | 'span' | 'div';
}

export function Typography({
  children,
  variant = 'body',
  as: Component = 'p',
  className = '',
  ...props
}: TypographyProps) {
  const variantClasses = {
    body: 'text-base text-white',
    small: 'text-sm text-gray-300',
    caption: 'text-xs text-gray-400',
  };

  return (
    <Component className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </Component>
  );
}
