'use client';

import type { ReactNode } from 'react';

import { CheckIcon } from './icons';

export interface BenefitCheckRowProps {
  children: ReactNode;
}

export function BenefitCheckRow({ children }: BenefitCheckRowProps) {
  return (
    <div className="flex items-center gap-2">
      <CheckIcon className="w-4 h-4 shrink-0 text-primary-500" />
      <span className="font-medium">{children}</span>
    </div>
  );
}
