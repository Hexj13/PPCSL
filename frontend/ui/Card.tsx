import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, hover = true, className = '', ...props }: CardProps) {
  return (
    <div className={`card ${hover ? 'hover:shadow-xl' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
