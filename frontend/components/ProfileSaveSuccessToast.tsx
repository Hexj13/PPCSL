'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { toast } from '@/lib/toast';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

function isHomePathname(pathname: string): boolean {
  const { restPath } = stripLocalePrefixFromPathname(pathname);
  return restPath === '/' || restPath === '';
}

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
    const showProfileDeleteSuccess = localStorageGetItem('showProfileDeleteSuccess');
    if (showProfileSaveSuccess === 'true') {
      localStorageRemoveItem('showProfileSaveSuccess');
      toast.success(t('completeProfile.saveSuccess'));
    }
    if (showProfileEmailVerificationSent === 'true') {
      localStorageRemoveItem('showProfileEmailVerificationSent');
      toast.success(t('completeProfile.registrationEmailVerificationSent'));
    }
    if (showProfileDeleteSuccess === 'true' && isHomePathname(pathname)) {
      localStorageRemoveItem('showProfileDeleteSuccess');
      toast.success(t('profile.deleteSuccess'));
    }
  }, [pathname, t]);

  return null;
}
