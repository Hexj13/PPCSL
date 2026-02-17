'use client';

import type { ComponentProps, ReactNode } from 'react';

interface TranslatedTextProps extends ComponentProps<'span'> {
  children: ReactNode;
}

export function TranslatedText({ children, ...props }: TranslatedTextProps) {
  return (
    <span {...props} suppressHydrationWarning>
      {children}
    </span>
  );
}
