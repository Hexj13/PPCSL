const authOAuthButtonBorderClass = 'border border-divider';

export const authOAuthIconButtonClass = [
  'relative h-10 w-10',
  'flex items-center justify-center',
  'rounded',
  authOAuthButtonBorderClass,
  'bg-bg-partnerLogo',
  'overflow-hidden transition-colors duration-200',
  'hover-only:hover:bg-bg-base active:bg-bg-secondary',
  'select-none disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const authOAuthIconButtonIconClass = 'h-5 w-5 shrink-0';

export const authOAuthIconButtonSkeletonClass = [
  'h-10 w-10 shrink-0',
  'bg-bg-secondary/40',
  'rounded',
  'animate-pulse',
].join(' ');
