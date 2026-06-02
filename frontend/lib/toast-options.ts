import type { DefaultToastOptions } from 'react-hot-toast';

import { designTokens } from '@/ui';

const baseToastClassName =
  '!z-[500] !min-w-[320px] !max-w-[400px] !w-full !bg-bg-card !text-primary-900 !border-2 !border-primary-700/40 !rounded-xl !p-4 !shadow-md';

export const defaultClientToastOptions: DefaultToastOptions = {
  className: baseToastClassName,
  style: {
    zIndex: designTokens.zIndex.toast,
  },
  success: {
    className: `${baseToastClassName} !border-semantic-success/60 !shadow-lg`,
  },
  error: {
    className: `${baseToastClassName} !border-semantic-error/60 !shadow-lg`,
  },
};
