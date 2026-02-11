'use client';

export function RequiredAsterisk({ filled }: { filled: boolean }) {
  return (
    <span className={filled ? 'text-green-500' : 'text-red-500'} aria-hidden>
      {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
      {' '}
      *
    </span>
  );
}
