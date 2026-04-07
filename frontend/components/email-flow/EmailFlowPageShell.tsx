'use client';

import type { ReactNode } from 'react';

type EmailFlowPageShellProps = {
  title: string;
  children: ReactNode;
  cardClassName?: string;
};

export function EmailFlowPageShell({
  title,
  children,
  cardClassName = 'card p-6 md:p-8 text-center',
}: EmailFlowPageShellProps) {
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {title}
      </h1>
      <div className={cardClassName}>{children}</div>
    </div>
  );
}
