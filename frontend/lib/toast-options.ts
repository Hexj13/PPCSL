import type { DefaultToastOptions } from 'react-hot-toast';

import { designTokens } from '@/ui';

const baseToastClassName =
  'kupito-toast !z-[500] !min-w-[320px] !max-w-[400px] !w-full !bg-bg-card !text-primary-900 !border-2 !border-primary-700/40 !rounded-xl !p-4 !shadow-md';

export const toastClassNames = {
  base: baseToastClassName,
  blank: baseToastClassName,
  success: `${baseToastClassName} kupito-toast--success !border-semantic-success/60 !shadow-lg`,
  error: `${baseToastClassName} kupito-toast--error !border-semantic-error/60 !shadow-lg`,
  warning: `${baseToastClassName} kupito-toast--warning !border-semantic-warning/60 !shadow-lg`,
} as const;

export const defaultClientToastOptions: DefaultToastOptions = {
  className: toastClassNames.base,
  style: {
    zIndex: designTokens.zIndex.toast,
  },
  success: {
    className: toastClassNames.success,
  },
  error: {
    className: toastClassNames.error,
  },
};
