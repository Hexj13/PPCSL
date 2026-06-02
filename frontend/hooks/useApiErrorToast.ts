import { useCallback } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { toast } from '@/lib/toast';

export function useApiErrorToast() {
  const { t } = useTranslation();

  return useCallback(
    (message?: string) => {
      toast.error(message ?? t('common.error'));
    },
    [t],
  );
}
