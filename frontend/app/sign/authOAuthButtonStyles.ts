const authOAuthIconButtonHeightClass = 'h-12';

const authOAuthIconButtonBorderClass = 'border border-[#dadce0]';

export const authOAuthIconButtonClass = [
  'relative flex-1 min-w-0',
  authOAuthIconButtonHeightClass,
  'flex items-center justify-center',
  'rounded-lg',
  authOAuthIconButtonBorderClass,
  'bg-white',
  'overflow-hidden transition-colors duration-200',
  'hover-only:hover:bg-[#f8f9fa] active:bg-[#f1f3f4]',
  'select-none disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const authOAuthIconButtonIconClass = 'w-6 h-6 shrink-0';

export const authOAuthIconButtonSkeletonClass = [
  'flex-1 min-w-0',
  authOAuthIconButtonHeightClass,
  authOAuthIconButtonBorderClass,
  'bg-bg-secondary/40 animate-pulse',
  'rounded-lg',
].join(' ');
