'use client';

import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { Spinner } from '@/ui';

export function AuthTransitionLoader({ label }: { label: string }) {
  return (
    <div
      className={`max-w-4xl mx-auto mt-6 md:mt-12 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
      aria-busy="true"
      data-testid="auth-transition-loader"
    >
      <div className="flex justify-center pt-24">
        <Spinner size="md" text={label} />
      </div>
    </div>
  );
}
