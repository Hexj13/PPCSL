'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { uploadApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { isBrowser } from '@/lib/utils';

import type { ListingFormData } from '../ListingForm';

interface UploadedImageDeleteMeta {
  path: string;
  deleteToken: string;
}

type TranslationFunction = (_key: string, _params?: Record<string, string | number>) => string;

export interface UploadSlot {
  id: string;
  status: 'queued' | 'uploading';
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
}

interface UseListingFormImagesParams {
  t: TranslationFunction;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  formSubmittedSuccessfullyRef?: React.MutableRefObject<boolean>;
}

const MAX_CONCURRENT_UPLOADS = 2;

export function useListingFormImages({
  t,
  setFormData,
  formSubmittedSuccessfullyRef,
}: UseListingFormImagesParams) {
  const [uploading, setUploading] = useState(false);
  const [hidePlates, setHidePlates] = useState(false);
  const [deletingImageUrls, setDeletingImageUrls] = useState<string[]>([]);
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([]);
  const uploadQueueRef = useRef<Array<{ file: File; slotId: string }>>([]);
  const uploadedImageDeleteMetaRef = useRef<Map<string, UploadedImageDeleteMeta>>(new Map());
  const uploadActiveCountRef = useRef(0);
  const processQueueRef = useRef<() => void>(() => {});
  const mountedRef = useRef(true);
  const uploadSessionRef = useRef(0);
  const slotPreviewUrlsRef = useRef<Map<string, string>>(new Map());

  const revokeSlotPreviewUrl = useCallback((slotId: string) => {
    const previewUrl = slotPreviewUrlsRef.current.get(slotId);
    if (!previewUrl) {
      return;
    }

    URL.revokeObjectURL(previewUrl);
    slotPreviewUrlsRef.current.delete(slotId);
  }, []);

  const clearUploadState = useCallback(
    (resetReactState: boolean) => {
      uploadSessionRef.current += 1;
      uploadQueueRef.current = [];
      uploadActiveCountRef.current = 0;
      uploadedImageDeleteMetaRef.current.clear();
      slotPreviewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      slotPreviewUrlsRef.current.clear();

      if (resetReactState && mountedRef.current) {
        setUploadSlots([]);
        setUploading(false);
        setDeletingImageUrls([]);
      }
    },
    [setDeletingImageUrls, setUploadSlots, setUploading],
  );

  useEffect(() => {
    mountedRef.current = true;
    const submittedRef = formSubmittedSuccessfullyRef;
    const metaRef = uploadedImageDeleteMetaRef;

    return () => {
      mountedRef.current = false;
      if (submittedRef === undefined || !submittedRef.current) {
        metaRef.current.forEach(({ path, deleteToken }) => {
          void uploadApi.deleteImage(path, deleteToken).catch(() => {});
        });
      }
      clearUploadState(false);
    };
  }, [clearUploadState, formSubmittedSuccessfullyRef]);

  const processQueue = useCallback(() => {
    if (
      uploadActiveCountRef.current >= MAX_CONCURRENT_UPLOADS ||
      uploadQueueRef.current.length === 0
    ) {
      return;
    }

    const item = uploadQueueRef.current.shift();
    if (!item) return;

    const { file, slotId } = item;
    const uploadSession = uploadSessionRef.current;
    uploadActiveCountRef.current++;
    setUploading(true);
    setUploadSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, status: 'uploading' } : slot)),
    );

    uploadApi
      .uploadImage(file, hidePlates)
      .then((response) => {
        if (uploadSession !== uploadSessionRef.current || !mountedRef.current) {
          if (response.data.path && response.data.deleteToken) {
            void uploadApi
              .deleteImage(response.data.path, response.data.deleteToken)
              .catch(() => {});
          }
          revokeSlotPreviewUrl(slotId);
          return;
        }

        let imageUrl = response.data.url;
        if (isBrowser && window.location.protocol === 'https:' && imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }

        if (response.data.path && response.data.deleteToken) {
          uploadedImageDeleteMetaRef.current.set(imageUrl, {
            path: response.data.path,
            deleteToken: response.data.deleteToken,
          });
        }

        setFormData((prev) => ({ ...prev, images: [...prev.images, imageUrl] }));
        setUploadSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, uploadedUrl: imageUrl } : s)),
        );
        toast.success(t('listings.photoUploaded'));
      })
      .catch((error: { response?: { status?: number; data?: { message?: unknown } } }) => {
        if (uploadSession !== uploadSessionRef.current || !mountedRef.current) {
          revokeSlotPreviewUrl(slotId);
          return;
        }

        const status = error?.response?.status;
        const backendMessage =
          typeof error?.response?.data?.message === 'string' ? error.response.data.message : null;

        if (status === 503) {
          toast.error(t('listings.serverBusyError'));
        } else if (backendMessage) {
          toast.error(backendMessage);
        } else if (hidePlates) {
          toast.error(t('listings.plateMaskError'));
        } else {
          toast.error(t('listings.photoUploadError'));
        }

        setUploadSlots((prev) => {
          revokeSlotPreviewUrl(slotId);
          return prev.filter((currentSlot) => currentSlot.id !== slotId);
        });
      })
      .finally(() => {
        if (uploadSession === uploadSessionRef.current && mountedRef.current) {
          uploadActiveCountRef.current--;
          if (uploadActiveCountRef.current === 0 && uploadQueueRef.current.length === 0) {
            setUploading(false);
          }
          processQueueRef.current();
        }
      });
  }, [hidePlates, revokeSlotPreviewUrl, setFormData, t]);

  processQueueRef.current = processQueue;

  const onUploadedImageLoaded = useCallback(
    (slotId: string) => {
      setUploadSlots((prev) => {
        const slot = prev.find((s) => s.id === slotId);
        if (!slot?.uploadedUrl) return prev;
        revokeSlotPreviewUrl(slotId);
        return prev.filter((s) => s.id !== slotId);
      });
    },
    [revokeSlotPreviewUrl],
  );

  const handleImageDelete = useCallback(
    async (imageUrl: string) => {
      if (deletingImageUrls.includes(imageUrl)) {
        return;
      }

      const deleteMeta = uploadedImageDeleteMetaRef.current.get(imageUrl);
      const deleteSession = uploadSessionRef.current;

      if (!deleteMeta) {
        setFormData((prev) => ({
          ...prev,
          images: prev.images.filter((img) => img !== imageUrl),
        }));
        return;
      }

      setDeletingImageUrls((prev) => [...prev, imageUrl]);

      try {
        await uploadApi.deleteImage(deleteMeta.path, deleteMeta.deleteToken);
        if (deleteSession !== uploadSessionRef.current || !mountedRef.current) {
          return;
        }
        uploadedImageDeleteMetaRef.current.delete(imageUrl);
        setFormData((prev) => ({
          ...prev,
          images: prev.images.filter((img) => img !== imageUrl),
        }));
      } catch {
        if (deleteSession !== uploadSessionRef.current || !mountedRef.current) {
          return;
        }
        toast.error(t('listings.photoDeleteError'));
      } finally {
        if (deleteSession === uploadSessionRef.current && mountedRef.current) {
          setDeletingImageUrls((prev) => prev.filter((url) => url !== imageUrl));
        }
      }
    },
    [deletingImageUrls, setFormData, t],
  );

  const handleFileUpload = useCallback(
    (files: File[], currentImageCount: number) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024;
      const validated: File[] = [];

      for (const file of files) {
        if (currentImageCount + uploadSlots.length + validated.length >= 20) {
          toast.error(t('listings.imageMaxCountError'));
          break;
        }
        if (!allowedTypes.includes(file.type)) {
          toast.error(t('listings.imageFormatError'));
          continue;
        }
        if (file.size > maxSize) {
          toast.error(t('listings.imageSizeError'));
          continue;
        }
        if (file.size === 0) {
          toast.error(t('listings.imageEmptyError'));
          continue;
        }
        validated.push(file);
      }

      if (validated.length === 0) return;

      const newSlots = validated.map((file) => ({
        id: crypto.randomUUID(),
        status: 'queued' as const,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      newSlots.forEach((slot) => {
        slotPreviewUrlsRef.current.set(slot.id, slot.previewUrl);
      });
      setUploadSlots((prev) => [...prev, ...newSlots]);
      newSlots.forEach((slot) => {
        uploadQueueRef.current.push({ file: slot.file, slotId: slot.id });
      });
      processQueue();
    },
    [processQueue, t, uploadSlots.length],
  );

  const resetUploadedImagesState = useCallback(() => {
    clearUploadState(true);
  }, [clearUploadState]);

  return {
    uploading,
    hidePlates,
    setHidePlates,
    deletingImageUrls,
    uploadSlots,
    handleFileUpload,
    handleImageDelete,
    onUploadedImageLoaded,
    resetUploadedImagesState,
  };
}
