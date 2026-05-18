'use client';

import { useEffect, useState } from 'react';

import { EmailFlowPageShell, EmailFlowSuccessState } from '@/components/email-flow';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';

export default function VerifyEmailSuccessPage() {
  const { t } = useTranslation();
  const { push, href } = useLocalizedNavigation();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, push]);

  return (
    <EmailFlowPageShell title={t('verifyEmail.success.title')}>
      <EmailFlowSuccessState
        description={t('verifyEmail.success.description')}
        ctaHref={href('/')}
        ctaLabel={t('common.goToHome')}
        footer={
          <>
            {t('verifyEmail.success.redirecting')} {countdown} {t('verifyEmail.success.seconds')}
          </>
        }
      />
    </EmailFlowPageShell>
  );
}
