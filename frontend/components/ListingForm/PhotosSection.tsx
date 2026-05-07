'use client';

import { useEffect, useState } from 'react';

import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import { Checkbox, HintTooltip } from '@/ui';

import { ListingPhotosVideoSection } from './photos-section/listing-photos-video-section';
import { PhotosGrid } from './photos-section/photos-grid';
import { useIsMobile } from './photos-section/use-is-mobile';
import type { ListingFormSectionProps } from './types';

export function PhotosSection({
  formData,
  setFormData,
  errors: _errors,
  clearError: _clearError,
  t,
  uploading = false,
  onFileUpload,
  onImageDelete,
  onUploadedImageLoaded,
  hidePlates = false,
  onHidePlatesChange,
  deletingImageUrls = [],
  uploadSlots = [],
  minPhotosRequired = 2,
  initialListingVideo: _initialListingVideo,
  videoPhase = 'idle',
  videoProgress = 0,
  onVideoFileSelected,
  onVideoRemove,
  listingVideoResolved,
  videoMaxSizeMb = 300,
  videoMaxDurationMin = 3,
  selectedVideoFileName,
}: ListingFormSectionProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewImageErrors, setPreviewImageErrors] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();

  useEffect(() => {
    if (previewIndex === null) return;
    if (formData.images.length === 0) {
      setPreviewIndex(null);
      return;
    }
    if (previewIndex > formData.images.length - 1) {
      setPreviewIndex(formData.images.length - 1);
    }
  }, [formData.images.length, previewIndex]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (onFileUpload) {
      onFileUpload(files);
    }
  };

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.photos')}
      </h2>
      {onHidePlatesChange && (
        <div className="mb-4">
          <Checkbox
            checked={hidePlates}
            onChange={onHidePlatesChange}
            label={
              <div className="inline-flex items-center gap-2">
                <span>{t('listings.hidePlates')}</span>
                <HintTooltip ariaLabel={t('listings.hidePlatesHelper')} width="w-72">
                  {t('listings.hidePlatesHelper')}
                </HintTooltip>
              </div>
            }
          />
        </div>
      )}
      <div className="mb-4">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading || formData.images.length >= 20}
          id="image-upload"
          className="hidden"
          data-testid="listing-form-photos-input"
        />
        <label
          htmlFor="image-upload"
          className={`inline-flex items-center justify-center gap-2 md:gap-2.5 min-h-12 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 font-medium text-base transition-colors duration-200 whitespace-nowrap select-none ${
            uploading || formData.images.length >= 20
              ? 'text-primary-700/50 border-primary-700/30 bg-primary-500/10 cursor-not-allowed'
              : 'text-primary-700 hover-only:hover:text-primary-900 border-primary-700/30 hover-only:hover:border-primary-700 bg-primary-500/10 cursor-pointer'
          }`}
          data-testid="listing-form-photos-trigger"
        >
          {uploading ? (
            t('common.loading')
          ) : (
            <>
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
              {t('listings.addPhotos')}
            </>
          )}
        </label>
      </div>
      {(formData.images.length > 0 || uploadSlots.length > 0) && (
        <PhotosGrid
          isMobile={isMobile}
          images={formData.images}
          imageIds={formData.images}
          uploadSlots={uploadSlots}
          deletingImageUrls={deletingImageUrls}
          t={t}
          setFormData={setFormData}
          onImageDelete={onImageDelete}
          onUploadedImageLoaded={onUploadedImageLoaded}
          setPreviewIndex={setPreviewIndex}
        />
      )}
      <ListingPageImageModal
        isOpen={previewIndex !== null && formData.images.length > 0}
        images={formData.images}
        currentIndex={previewIndex ?? 0}
        imageAltTitle={t('listings.defaultTitle')}
        imageErrors={previewImageErrors}
        onClose={() => setPreviewIndex(null)}
        onNext={() => {
          if (formData.images.length <= 1 || previewIndex === null) return;
          setPreviewIndex((previewIndex + 1) % formData.images.length);
        }}
        onPrev={() => {
          if (formData.images.length <= 1 || previewIndex === null) return;
          setPreviewIndex((previewIndex - 1 + formData.images.length) % formData.images.length);
        }}
        onIndexChange={setPreviewIndex}
        onImageError={(index) =>
          setPreviewImageErrors((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
          })
        }
      />
      <p className="mt-2 text-sm text-gray-400" data-testid="listing-form-photos-count">
        {t('listings.uploadedCount', { count: formData.images.length })}{' '}
        {formData.images.length < minPhotosRequired && (
          <span className="text-red-400">
            {t('listings.minPhotosRequired', { count: minPhotosRequired })}
          </span>
        )}
      </p>
      <ListingPhotosVideoSection
        t={t}
        videoPhase={videoPhase}
        videoProgress={videoProgress}
        onVideoFileSelected={onVideoFileSelected}
        onVideoRemove={onVideoRemove}
        listingVideoResolved={listingVideoResolved}
        videoMaxSizeMb={videoMaxSizeMb}
        videoMaxDurationMin={videoMaxDurationMin}
        selectedVideoFileName={selectedVideoFileName}
      />
    </div>
  );
}
