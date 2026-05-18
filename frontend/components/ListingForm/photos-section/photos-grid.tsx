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
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';

import type { ListingFormData } from '../listingFormTypes';
import type { ListingFormSectionProps } from '../types';

import { PhotoCard } from './photo-card';
import { SortablePhotoCard } from './sortable-photo-card';
import { UploadSlotTile } from './upload-slot-tile';

type UploadSlot = NonNullable<ListingFormSectionProps['uploadSlots']>[number];

export function PhotosGrid({
  isMobile,
  images,
  imageIds,
  uploadSlots,
  deletingImageUrls,
  t,
  setFormData,
  onImageDelete,
  onUploadedImageLoaded,
  setPreviewIndex,
}: {
  isMobile: boolean;
  images: string[];
  imageIds: string[];
  uploadSlots: UploadSlot[];
  deletingImageUrls: string[];
  t: ListingFormSectionProps['t'];
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onImageDelete?: (_url: string) => void | Promise<void>;
  onUploadedImageLoaded?: (_slotId: string) => void;
  setPreviewIndex: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const slotByUploadedUrl = new Map(
    uploadSlots
      .filter((s): s is UploadSlot & { uploadedUrl: string } => !!s.uploadedUrl)
      .map((s) => [s.uploadedUrl, s]),
  );

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
      const prevImages = prev.images;
      const oldIndex = prevImages.indexOf(active.id as string);
      const newIndex = prevImages.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const nextImages = arrayMove(prevImages, oldIndex, newIndex);
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

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length || fromIndex === toIndex) return;
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

  const removeImageAtIndex = (index: number, url: string) => {
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
        cover_blur_hash: firstHash && typeof firstHash === 'string' ? firstHash : '',
      };
    });
  };

  const renderSlot = (slot: UploadSlot) => (
    <UploadSlotTile key={slot.id} slot={slot} t={t} onUploadedImageLoaded={onUploadedImageLoaded} />
  );

  const renderImageCell = (url: string, index: number) => {
    const slot = slotByUploadedUrl.get(url);
    if (slot) return renderSlot(slot);
    const cardProps = {
      url,
      index,
      isMain: index === 0,
      t,
      onPreview: () => setPreviewIndex(index),
      onMoveUp: () => moveImage(index, index - 1),
      onMoveDown: () => moveImage(index, index + 1),
      onDelete: () => removeImageAtIndex(index, url),
      deleting: deletingImageUrls.includes(url),
      canMoveUp: index > 0,
      canMoveDown: index < images.length - 1,
    };
    if (isMobile) {
      return <PhotoCard key={url} {...cardProps} />;
    }
    return <SortablePhotoCard key={url} id={url} {...cardProps} />;
  };

  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="photos-grid">
      {isMobile ? (
        <>
          {images.map((url, index) => renderImageCell(url, index))}
          {uploadSlots.filter((s) => !s.uploadedUrl).map((slot) => renderSlot(slot))}
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={imageIds} strategy={rectSortingStrategy}>
            {images.map((url, index) => renderImageCell(url, index))}
            {uploadSlots.filter((s) => !s.uploadedUrl).map((slot) => renderSlot(slot))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
