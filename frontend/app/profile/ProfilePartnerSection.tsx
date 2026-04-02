import Link from 'next/link';

import { PlatformPartnerBadge } from '@/components/common/PlatformPartnerBadge';
import type { TranslationFn } from '@/hooks/useTranslation';
import type { User } from '@/lib/api';
import { InfoBlock } from '@/ui';

export function ProfilePartnerSection({ user, t }: { user: User; t: TranslationFn }) {
  const isPartner = user.type === 'Business' && user.isPlatformPartner === true;
  const progress = Math.max(0, user.partnerListingProgress ?? 0);
  const freePromotionBalance = Math.max(0, user.freePromotionBalance ?? 0);
  const listingsUntilNext = 20 - (progress % 20 || 0);

  return (
    <div className="card p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-primary-900 mb-5">
        {t('profile.partnerProgramTitle')}
      </h2>

      <InfoBlock className="mb-5">
        <ul className="list-disc pl-5 space-y-2 m-0">
          <li>{t('profile.partnerProgramHint')}</li>
          <li>{t('profile.partnerProgramDescription')}</li>
          {isPartner ? <li>{t('profile.partnerUsageHint')}</li> : null}
        </ul>
      </InfoBlock>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-primary-700 font-semibold">{t('profile.partnerStatus')}</span>
          {isPartner ? (
            <PlatformPartnerBadge />
          ) : (
            <span style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {t('profile.partnerStatusInactive')}
            </span>
          )}
        </div>

        {isPartner ? (
          <>
            <div>
              <span className="text-primary-700 font-semibold">
                {t('profile.partnerNextRewardCounter')}
              </span>{' '}
              <span style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {t('profile.partnerNextRewardCounterValue', { count: listingsUntilNext })}
              </span>
            </div>
            <div>
              <span className="text-primary-700 font-semibold">
                {t('profile.partnerFreePromotionBalance')}
              </span>{' '}
              <span style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {freePromotionBalance}
              </span>
            </div>
          </>
        ) : null}
      </div>

      {!isPartner ? (
        <div className="mt-5">
          <Link
            href="/contacts"
            className="inline-flex min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
          >
            {t('profile.partnerContactCta')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
