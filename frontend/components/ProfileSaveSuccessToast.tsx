'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { toast } from '@/lib/toast';

export function ProfileSaveSuccessToast() {
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const showProfileSaveSuccess = localStorage.getItem('showProfileSaveSuccess');
    if (showProfileSaveSuccess === 'true') {
      localStorage.removeItem('showProfileSaveSuccess');
      toast.success(t('completeProfile.saveSuccess'));
    }
  }, [pathname, t]);

  return null;
}
