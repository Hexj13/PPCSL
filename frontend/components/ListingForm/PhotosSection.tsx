'use client';

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { ListingPageImageModal } from '@/components/ListingPage/ListingPageImageModal';
import { Checkbox, ChevronDownIcon, HintTooltip, TrashIcon } from '@/ui';

import type { ListingFormSectionProps } from './types';

const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

interface PhotoCardProps {
  url: string;
  index: number;
  isMain: boolean;
  t: ListingFormSectionProps['t'];
  onPreview: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  deleting: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function PhotoCard({
  url,
  index,
  isMain,
  t,
  onPreview,
  onMoveUp,
  onMoveDown,
  onDelete,
  deleting,
  canMoveUp,
  canMoveDown,
}: PhotoCardProps) {
  return (
    <div className="flex flex-col">
      <div
        className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer touch-pan-y select-none"
        onClick={onPreview}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview();
          }
        }}
      >
        <Image
          src={url}
          alt={t('listings.imageAlt', {
            title: t('listings.defaultTitle'),
            index: String(index + 1),
          })}
          fill
          className="object-cover"
          draggable={false}
          unoptimized
          sizes="(max-width: 767px) 50vw, 33vw"
        />
        {isMain && (
          <span className="absolute top-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded">
            {t('listings.mainPhoto')}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-primary-700 enabled:active:text-primary-900 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
          title={t('listings.moveUp')}
          aria-label={t('listings.moveUp')}
        >
          <ChevronDownIcon className="h-5 w-5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-red-400 enabled:active:text-red-500 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          title={t('listings.deleteImage')}
          aria-label={t('listings.deleteImage')}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={!canMoveDown}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-primary-700 enabled:active:text-primary-900 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
          title={t('listings.moveDown')}
          aria-label={t('listings.moveDown')}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SortablePhotoCard({
  id,
  url,
  index,
  isMain,
  t,
  onPreview,
  onMoveUp,
  onMoveDown,
  onDelete,
  deleting,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  url: string;
  index: number;
  isMain: boolean;
  t: ListingFormSectionProps['t'];
  onPreview: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  deleting: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const pressStartedAtRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const resetPressState = () => {
    pressStartedAtRef.current = null;
    pointerStartRef.current = null;
  };

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    pressStartedAtRef.current = Date.now();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    suppressNextClickRef.current = false;
  };

  const handlePointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const deltaX = Math.abs(e.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerStartRef.current.y);
    if (deltaX > 6 || deltaY > 6) {
      suppressNextClickRef.current = true;
    }
  };

  const handlePointerUpCapture = () => {
    if (pressStartedAtRef.current !== null && Date.now() - pressStartedAtRef.current >= 250) {
      suppressNextClickRef.current = true;
    }
    resetPressState();
  };

  const handlePreviewClick = () => {
    if (isDragging || suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onPreview();
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer touch-none select-none ${isDragging ? 'opacity-50 z-10' : ''}`}
        onClick={handlePreviewClick}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerMoveCapture={handlePointerMoveCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onPointerCancelCapture={resetPressState}
        {...attributes}
        {...listeners}
      >
        <Image
          src={url}
          alt={t('listings.imageAlt', {
            title: t('listings.defaultTitle'),
            index: String(index + 1),
          })}
          fill
          className="object-cover"
          draggable={false}
          unoptimized
          sizes="(max-width: 767px) 50vw, 33vw"
        />
        {isMain && (
          <span className="absolute top-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded">
            {t('listings.mainPhoto')}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-primary-700 enabled:active:text-primary-900 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
          title={t('listings.moveUp')}
          aria-label={t('listings.moveUp')}
        >
          <ChevronDownIcon className="h-5 w-5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-red-400 enabled:active:text-red-500 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          title={t('listings.deleteImage')}
          aria-label={t('listings.deleteImage')}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={!canMoveDown}
          className="inline-flex items-center justify-center rounded-full p-2 text-text-secondary transition-colors duration-200 enabled:hover:text-primary-700 enabled:active:text-primary-900 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
          title={t('listings.moveDown')}
          aria-label={t('listings.moveDown')}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function PhotosSection({
  formData,
  setFormData,
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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFormData((prev) => {
      const images = prev.images;
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const nextImages = arrayMove(images, oldIndex, newIndex);
      const nextHashes = arrayMove(prev.image_blur_hashes, oldIndex, newIndex);
      const firstHash = nextHashes[0];
      return {
        ...prev,
        images: nextImages,
        image_blur_hashes: nextHashes,
        cover_blur_hash: firstHash && typeof firstHash === 'string' ? firstHash : '',
      };
    });
  };

  const imageIds = formData.images;
  const slotByUploadedUrl = new Map(
    uploadSlots
      .filter((s): s is typeof s & { uploadedUrl: string } => !!s.uploadedUrl)
      .map((s) => [s.uploadedUrl, s]),
  );
  const renderUploadSlot = (slot: (typeof uploadSlots)[number]) => (
    <div key={slot.id} className="flex flex-col">
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
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.images.length || fromIndex === toIndex) return;
    setFormData((prev) => {
      const nextImages = arrayMove(prev.images, fromIndex, toIndex);
      const nextHashes = arrayMove(prev.image_blur_hashes, fromIndex, toIndex);
      const firstHash = nextHashes[0];
      return {
        ...prev,
        images: nextImages,
        image_blur_hashes: nextHashes,
        cover_blur_hash: firstHash && typeof firstHash === 'string' ? firstHash : '',
      };
    });
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
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="photos-grid">
          {isMobile ? (
            <>
              {formData.images.map((url, index) => {
                const slot = slotByUploadedUrl.get(url);
                if (slot) return renderUploadSlot(slot);
                return (
                  <PhotoCard
                    key={url}
                    url={url}
                    index={index}
                    isMain={index === 0}
                    t={t}
                    onPreview={() => setPreviewIndex(index)}
                    onMoveUp={() => moveImage(index, index - 1)}
                    onMoveDown={() => moveImage(index, index + 1)}
                    onDelete={() => {
                      if (onImageDelete) {
                        void onImageDelete(url);
                        return;
                      }
                      setFormData((prev) => {
                        const nextImages = prev.images.filter((_, i) => i !== index);
                        const nextHashes = prev.image_blur_hashes.filter((_, i) => i !== index);
                        const firstHash = nextHashes[0];
                        return {
                          ...prev,
                          images: nextImages,
                          image_blur_hashes: nextHashes,
                          cover_blur_hash:
                            firstHash && typeof firstHash === 'string' ? firstHash : '',
                        };
                      });
                    }}
                    deleting={deletingImageUrls.includes(url)}
                    canMoveUp={index > 0}
                    canMoveDown={index < formData.images.length - 1}
                  />
                );
              })}
              {uploadSlots.filter((s) => !s.uploadedUrl).map((slot) => renderUploadSlot(slot))}
            </>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                {formData.images.map((url, index) => {
                  const slot = slotByUploadedUrl.get(url);
                  if (slot) return renderUploadSlot(slot);
                  return (
                    <SortablePhotoCard
                      key={url}
                      id={url}
                      url={url}
                      index={index}
                      isMain={index === 0}
                      t={t}
                      onPreview={() => setPreviewIndex(index)}
                      onMoveUp={() => moveImage(index, index - 1)}
                      onMoveDown={() => moveImage(index, index + 1)}
                      onDelete={() => {
                        if (onImageDelete) {
                          void onImageDelete(url);
                          return;
                        }
                        setFormData((prev) => {
                          const nextImages = prev.images.filter((_, i) => i !== index);
                          const nextHashes = prev.image_blur_hashes.filter((_, i) => i !== index);
                          const firstHash = nextHashes[0];
                          return {
                            ...prev,
                            images: nextImages,
                            image_blur_hashes: nextHashes,
                            cover_blur_hash:
                              firstHash && typeof firstHash === 'string' ? firstHash : '',
                          };
                        });
                      }}
                      deleting={deletingImageUrls.includes(url)}
                      canMoveUp={index > 0}
                      canMoveDown={index < formData.images.length - 1}
                    />
                  );
                })}
                {uploadSlots.filter((s) => !s.uploadedUrl).map((slot) => renderUploadSlot(slot))}
              </SortableContext>
            </DndContext>
          )}
        </div>
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
    </div>
  );
}
