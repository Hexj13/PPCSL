'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

export function MultiSelectOptionLeadingLogo({
  src,
  sizeClassName = 'w-6 h-6',
}: {
  src?: string;
  sizeClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (!src || failed) {
    return null;
  }

  return (
    <span
      className={`relative ${sizeClassName} shrink-0 flex items-center justify-center`}
      aria-hidden
    >
      <Image
        src={src}
        alt={' '}
        width={24}
        height={24}
        className="object-contain max-w-full max-h-full"
        unoptimized
        onError={onError}
      />
    </span>
  );
}
