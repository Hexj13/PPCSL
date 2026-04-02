'use client';

import { ApprovedSignalIcon } from '@/components/common/ApprovedSignalIcon';
import { useTranslation } from '@/hooks/useTranslation';

const BASE_CLASS =
  'relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary whitespace-nowrap before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none';

export function PlatformPartnerBadge({ elevated = false }: { elevated?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`${BASE_CLASS}${elevated ? ' shadow-lg' : ''}`}>
      <ApprovedSignalIcon className="relative z-10" />
      <span className="relative z-10">{t('listingDetail.platformPartner')}</span>
    </span>
  );
}
