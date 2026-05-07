import Image from 'next/image';

import { ChevronDownIcon, TrashIcon } from '@/ui';

import type { ListingFormSectionProps } from '../types';

export interface PhotoCardProps {
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

export function PhotoCard({
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
