import { useRef } from 'react';

import { InfoBlock, HintTooltip } from '@/ui';

import type { ListingFormSectionProps } from '../types';

export function ListingPhotosVideoSection({
  t,
  videoPhase,
  videoProgress,
  onVideoFileSelected,
  onVideoRemove,
  listingVideoResolved,
  videoMaxSizeMb,
  videoMaxDurationMin,
  selectedVideoFileName,
}: {
  t: ListingFormSectionProps['t'];
  videoPhase: NonNullable<ListingFormSectionProps['videoPhase']>;
  videoProgress: number;
  onVideoFileSelected?: (_file: File) => void;
  onVideoRemove?: () => void | Promise<void>;
  listingVideoResolved?: ListingFormSectionProps['listingVideoResolved'];
  videoMaxSizeMb: number;
  videoMaxDurationMin: number;
  selectedVideoFileName?: string | null;
}) {
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onVideoFileSelected) {
      void onVideoFileSelected(file);
    }
  };

  const openVideoFilePicker = () => {
    videoFileInputRef.current?.click();
  };

  const inputDisabled = videoPhase === 'uploading' || videoPhase === 'processing';

  const showVideoConstraints = videoPhase === 'idle' || videoPhase === 'failed';

  return (
    <div className="mt-8 pt-6 border-t border-primary-700/30">
      <h3 className="text-lg md:text-xl font-bold mb-3 text-primary-900">
        {t('listingForm.video.title')}
      </h3>
      {showVideoConstraints ? (
        <InfoBlock variant="info" className="mb-4">
          {t('listingForm.video.constraints', {
            maxSizeMb: videoMaxSizeMb,
            maxDurationMin: videoMaxDurationMin,
          })}
        </InfoBlock>
      ) : null}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
        className="hidden"
        id="listing-form-video-upload"
        data-testid="listing-form-video-input"
        onChange={handleVideoInputChange}
        disabled={inputDisabled}
      />
      <div className="space-y-4">
        {videoPhase === 'selected' && selectedVideoFileName ? (
          <div className="space-y-3">
            <div className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium leading-snug min-w-0">
              <span className="shrink-0" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {t('listingForm.video.fileLabel')}
              </span>
              <span
                className="break-all min-w-0"
                style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                data-testid="listing-form-video-staged-name"
              >
                {selectedVideoFileName}
              </span>
              <HintTooltip
                ariaLabel={t('listingForm.video.stagedHintTooltip')}
                width="w-72"
                className="shrink-0"
              >
                {t('listingForm.video.stagedHintTooltip')}
              </HintTooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onVideoRemove?.()}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-primary-700 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover-only:hover:border-primary-900 hover-only:hover:text-primary-900"
              >
                {t('listingForm.video.remove')}
              </button>
            </div>
          </div>
        ) : null}
        {videoPhase === 'ready' &&
        listingVideoResolved &&
        (listingVideoResolved.thumbUrl || listingVideoResolved.mp4Url) ? (
          <div className="flex max-w-md w-full flex-col gap-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-primary-700/20">
              {listingVideoResolved.mp4Url ? (
                <video
                  src={listingVideoResolved.mp4Url}
                  poster={listingVideoResolved.thumbUrl ?? undefined}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  aria-label={t('listingForm.video.posterAlt')}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element -- CDN poster URL */
                <img
                  src={listingVideoResolved.thumbUrl ?? ''}
                  alt={t('listingForm.video.posterAlt')}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onVideoRemove?.()}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-primary-700 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover-only:hover:border-primary-900 hover-only:hover:text-primary-900"
              >
                {t('listingForm.video.remove')}
              </button>
            </div>
          </div>
        ) : null}
        {videoPhase === 'ready' &&
        listingVideoResolved &&
        !listingVideoResolved.thumbUrl &&
        !listingVideoResolved.mp4Url ? (
          <p className="text-sm text-primary-700">{t('listingForm.video.status.ready')}</p>
        ) : null}
        {videoPhase === 'idle' || videoPhase === 'failed' ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openVideoFilePicker}
              disabled={inputDisabled}
              className={`inline-flex items-center justify-center gap-2 md:gap-2.5 min-h-12 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 font-medium text-base transition-colors duration-200 whitespace-nowrap select-none ${
                inputDisabled
                  ? 'text-primary-700/50 border-primary-700/30 bg-primary-500/10 cursor-not-allowed'
                  : 'text-primary-700 hover-only:hover:text-primary-900 border-primary-700/30 hover-only:hover:border-primary-700 bg-primary-500/10 cursor-pointer'
              }`}
              data-testid="listing-form-video-add-trigger"
            >
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              {t('listingForm.video.addButton')}
            </button>
            {videoPhase === 'failed' ? (
              <span className="text-sm text-red-400">{t('listingForm.video.status.failed')}</span>
            ) : null}
          </div>
        ) : null}
        {videoPhase === 'uploading' || videoPhase === 'processing' ? (
          <div className="max-w-md space-y-2">
            <p className="text-sm text-primary-700">
              {videoPhase === 'uploading'
                ? t('listingForm.video.status.uploading')
                : t('listingForm.video.status.processing')}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-700/20">
              <div
                className="h-full rounded-full bg-primary-700 transition-all duration-300"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
