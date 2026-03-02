'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export const RESET_SEARCH_EVENT = 'kupito-reset-search';

type HeaderLogoProps = {
  brandAlt: string;
};

export function HeaderLogo({ brandAlt }: HeaderLogoProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = (e: React.MouseEvent) => {
    if (pathname !== '/') return;
    const hasParams = searchParams.toString().length > 0;
    if (!hasParams) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(RESET_SEARCH_EVENT));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="flex shrink-0 items-center hover-only:hover:opacity-90 transition-opacity duration-200 select-none mr-4 lg:mr-6"
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
