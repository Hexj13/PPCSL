'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EmailFlowPageShell, EmailFlowSuccessState } from '@/components/email-flow';
import { useTranslation } from '@/hooks/useTranslation';

export default function ConfirmEmailChangeSuccessPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/profile');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

  return (
    <EmailFlowPageShell title={t('profile.confirmEmail.success.title')}>
      <EmailFlowSuccessState
        description={t('profile.confirmEmail.success.description')}
        ctaHref="/profile"
        ctaLabel={t('profile.confirmEmail.goToProfile')}
        footer={
          <>
            {t('profile.confirmEmail.success.redirecting')} {countdown}{' '}
            {t('profile.confirmEmail.success.seconds')}
          </>
        }
      />
    </EmailFlowPageShell>
  );
}
