'use client';

import Image from 'next/image';
import Link from 'next/link';

type HeaderLogoProps = {
  brandAlt: string;
};

export function HeaderLogo({ brandAlt }: HeaderLogoProps) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center hover:opacity-90 transition-opacity duration-200 select-none mr-4 lg:mr-6"
    >
      <Image
        src="/logo-desktop.svg"
        alt={brandAlt}
        width={200}
        height={65}
        className="hidden lg:block h-8 md:h-10 w-auto"
        priority
        suppressHydrationWarning
      />
      <Image
        src="/logo-mobile.svg"
        alt={brandAlt}
        width={150}
        height={48}
        className="lg:hidden h-8 w-auto"
        priority
        suppressHydrationWarning
      />
    </Link>
  );
}
