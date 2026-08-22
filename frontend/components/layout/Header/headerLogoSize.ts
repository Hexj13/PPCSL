import type { CSSProperties } from 'react';

import type { HeaderLogoConfig } from '@/lib/site-config';

/** Stock PPCSL wordmark viewBoxes: full mark from xl, short mark below xl. */
export const DEFAULT_HEADER_LOGO: HeaderLogoConfig = {
  desktop: { width: 1905, height: 508 },
  mobile: { width: 839, height: 329 },
};

export function resolveHeaderLogo(headerLogo?: HeaderLogoConfig): HeaderLogoConfig {
  return {
    desktop: headerLogo?.desktop ?? DEFAULT_HEADER_LOGO.desktop,
    mobile: headerLogo?.mobile ?? DEFAULT_HEADER_LOGO.mobile,
  };
}

export function headerLogoAspectVars(logo: HeaderLogoConfig): CSSProperties {
  return {
    ['--header-logo-desktop-aspect' as string]: `${logo.desktop.width} / ${logo.desktop.height}`,
    ['--header-logo-mobile-aspect' as string]: `${logo.mobile.width} / ${logo.mobile.height}`,
  };
}
