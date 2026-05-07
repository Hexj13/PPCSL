import type { ListingFormSectionProps } from '../types';

type UploadSlot = NonNullable<ListingFormSectionProps['uploadSlots']>[number];

export function UploadSlotTile({
  slot,
  t,
  onUploadedImageLoaded,
}: {
  slot: UploadSlot;
  t: ListingFormSectionProps['t'];
  onUploadedImageLoaded?: (_slotId: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-primary-700/20 flex items-center justify-center">
        {slot.uploadedUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- server URL, load then replace slot */}
            <img
              src={slot.uploadedUrl}
              alt={t('common.loading')}
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={() => onUploadedImageLoaded?.(slot.id)}
              onError={() => onUploadedImageLoaded?.(slot.id)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-primary-900/30">
              <span className="text-primary-100 text-sm">{t('common.loading')}</span>
            </div>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from createObjectURL */}
            <img
              src={slot.previewUrl}
              alt={t('common.loading')}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div
              className={`absolute inset-0 flex items-center justify-center bg-primary-900/30 ${
                slot.status === 'queued' ? 'animate-pulse' : ''
              }`}
            >
              <span className="text-primary-100 text-sm">{t('common.loading')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
