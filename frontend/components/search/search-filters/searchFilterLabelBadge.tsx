'use client';

import type { ReactNode } from 'react';

export const FIRE_EMOJI = '🔥';
export const SPARKLES_EMOJI = '\u2728';

export function renderSearchFilterLabelBadge(
  label: string,
  emoji: string,
  borderColor: string,
  bgColor: string,
): ReactNode {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 ${borderColor} text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg ${bgColor} before:pointer-events-none`}
    >
      <span
        className="relative z-10 shrink-0 text-text-secondary"
        style={{ filter: 'grayscale(1) brightness(0.5)' }}
      >
        {emoji}
      </span>
      <span className="relative z-10">{label}</span>
    </span>
  );
}
