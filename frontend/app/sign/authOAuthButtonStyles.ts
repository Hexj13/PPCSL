const authOAuthIconButtonHeightClass = 'h-12';

const authOAuthIconButtonBorderClass = 'border border-divider';

export const authOAuthIconButtonClass = [
  'relative flex-1 min-w-0',
  authOAuthIconButtonHeightClass,
  'flex items-center justify-center',
  'rounded-lg',
  authOAuthIconButtonBorderClass,
  'bg-bg-partnerLogo',
  'overflow-hidden transition-colors duration-200',
  'hover-only:hover:bg-bg-base active:bg-bg-secondary',
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
