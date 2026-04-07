'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { toast } from '@/lib/toast';

export function ProfileSaveSuccessToast() {
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const showProfileSaveSuccess = localStorageGetItem('showProfileSaveSuccess');
    const showProfileEmailVerificationSent = localStorageGetItem(
      'showProfileEmailVerificationSent',
    );
    if (showProfileSaveSuccess === 'true') {
      localStorageRemoveItem('showProfileSaveSuccess');
      toast.success(t('completeProfile.saveSuccess'));
    }
    if (showProfileEmailVerificationSent === 'true') {
      localStorageRemoveItem('showProfileEmailVerificationSent');
      toast.success(t('completeProfile.registrationEmailVerificationSent'));
    }
  }, [pathname, t]);

  return null;
}
