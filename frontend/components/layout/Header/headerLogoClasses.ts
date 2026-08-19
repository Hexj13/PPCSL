/** Matches the rendered logo box so skeletons do not shift when the image appears. */
export const HEADER_LOGO_WRAP_CLASSES =
  'flex h-full min-h-[44px] shrink-0 select-none items-center mr-4 lg:mr-6';

/** Full wordmark: from `xl` (1280px). SVG viewBox 1905×508 at header height 48px. */
export const HEADER_LOGO_DESKTOP_SLOT_CLASSES = 'relative hidden h-12 aspect-[1905/508] xl:block';

/** Short mark: below `xl`, including 1024 desktop. SVG viewBox 839×329. */
export const HEADER_LOGO_MOBILE_SLOT_CLASSES = 'relative h-10 aspect-[839/329] lg:h-12 xl:hidden';

export const HEADER_LOGO_SKELETON_FILL_CLASSES =
  'absolute inset-0 rounded-sm bg-primary-700/20 animate-pulse';
