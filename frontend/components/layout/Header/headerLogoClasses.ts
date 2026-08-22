/** Matches the rendered logo box so skeletons do not shift when the image appears. */
export const HEADER_LOGO_WRAP_CLASSES =
  'flex h-full min-h-[44px] shrink-0 select-none items-center mr-4 lg:mr-6';

/** Full mark: from `xl` (1280px). Aspect from `--header-logo-desktop-aspect`. */
export const HEADER_LOGO_DESKTOP_SLOT_CLASSES =
  'relative hidden h-12 aspect-[var(--header-logo-desktop-aspect)] xl:block';

/** Short mark: below `xl`, including 1024 desktop. Aspect from `--header-logo-mobile-aspect`. */
export const HEADER_LOGO_MOBILE_SLOT_CLASSES =
  'relative h-10 aspect-[var(--header-logo-mobile-aspect)] lg:h-12 xl:hidden';

export const HEADER_LOGO_SKELETON_FILL_CLASSES =
  'absolute inset-0 rounded-sm bg-primary-700/20 animate-pulse';
