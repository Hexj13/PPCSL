'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ListingVideoPayload } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import {
  listingVideoPartSizeDefault,
  uploadListingVideoMultipart,
} from '@/lib/listing-video-upload';
import { toast } from '@/lib/toast';

const ALLOWED = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
]);

const FALLBACK_MAX_BYTES = 314572800;
const FALLBACK_MAX_DURATION_SEC = 180;

export type ListingFormVideoPhase =
  | 'idle'
  | 'selected'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

export function useListingFormVideo({
  t,
  listingId,
  initialListingVideo,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  listingId: string | undefined;
  initialListingVideo?: ListingVideoPayload | null;
}) {
  const [phase, setPhase] = useState<ListingFormVideoPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resolvedVideo, setResolvedVideo] = useState<ListingVideoPayload | null>(() =>
    initialListingVideo?.status === 'published' ? initialListingVideo : null,
  );
  const [stagedVideoToken, setStagedVideoToken] = useState<string | null>(null);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(FALLBACK_MAX_BYTES);
  const [maxDurationSec, setMaxDurationSec] = useState(FALLBACK_MAX_DURATION_SEC);
  const [allowedContentTypes, setAllowedContentTypes] = useState<Set<string>>(ALLOWED);
  const [pollListingId, setPollListingId] = useState<string | undefined>(listingId);
  const abortRef = useRef(false);

  useEffect(() => {
    setPollListingId(listingId);
  }, [listingId]);

  useEffect(() => {
    if (initialListingVideo?.status === 'published') {
      setResolvedVideo(initialListingVideo);
    }
  }, [initialListingVideo]);

  useEffect(() => {
    if (!initialListingVideo) {
      setPhase((p) => (p === 'ready' || p === 'failed' ? 'idle' : p));
      return;
    }
    if (initialListingVideo.status === 'published') {
      setPhase('ready');
    } else if (
      initialListingVideo.status === 'processing' ||
      initialListingVideo.status === 'pending'
    ) {
      setPhase('processing');
    } else if (initialListingVideo.status === 'failed') {
      setPhase('failed');
    }
  }, [initialListingVideo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await listingsApi.getListingVideoConstraints();
        if (cancelled) return;
        setMaxFileSizeBytes(data.maxFileSizeBytes);
        setMaxDurationSec(data.maxDurationSec);
        if (Array.isArray(data.allowedContentTypes) && data.allowedContentTypes.length > 0) {
          setAllowedContentTypes(new Set(data.allowedContentTypes));
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateVideoFile = useCallback(
    (file: File): boolean => {
      if (!allowedContentTypes.has(file.type)) {
        toast.error(t('listingForm.video.errors.invalidType'));
        return false;
      }
      if (file.size > maxFileSizeBytes) {
        toast.error(t('listingForm.video.errors.tooLarge'));
        return false;
      }
      return true;
    },
    [allowedContentTypes, maxFileSizeBytes, t],
  );

  const performUpload = useCallback(
    async (targetListingId: string, file: File, options?: { toastOnFailure?: boolean }) => {
      const toastOnFailure = options?.toastOnFailure !== false;
      abortRef.current = false;
      setPhase('uploading');
      setProgress(0);
      setPollListingId(targetListingId);
      try {
        const initRes = await listingsApi.videoUploadInit(targetListingId, {
          fileSize: file.size,
          fileName: file.name,
          contentType: file.type,
        });
        const { data: init } = initRes;
        const partSize = init.partSizeBytes ?? listingVideoPartSizeDefault();
        const parts = await uploadListingVideoMultipart({
          file,
          parts: init.parts,
          partSizeBytes: partSize,
          onProgress: (r) => setProgress(Math.round(r * 100)),
        });
        if (abortRef.current) return false;
        await listingsApi.videoUploadComplete(targetListingId, {
          uploadId: init.uploadId,
          parts,
        });
        setPhase('processing');
        setProgress(100);
        setSelectedFile(null);
        return true;
      } catch {
        setPhase('failed');
        if (toastOnFailure) {
          toast.error(t('listingForm.video.errors.uploadFailed'));
        }
        return false;
      }
    },
    [t],
  );

  const pollStagedVideoUntilReady = useCallback(async (token: string): Promise<string | null> => {
    let currentToken = token;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (abortRef.current) return null;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (abortRef.current) return null;
      const { data } = await listingsApi.getStagedVideoStatus(currentToken);
      if (abortRef.current) return null;
      currentToken = data.stagedVideoToken;
      setStagedVideoToken(currentToken);
      if (typeof data.progress === 'number') {
        setProgress(Math.max(75, Math.min(99, data.progress)));
      }
      if (data.status === 'published' && data.video) {
        setResolvedVideo(data.video);
        setPhase('ready');
        setProgress(100);
        setSelectedFile(null);
        return currentToken;
      }
      if (data.status === 'failed') {
        return null;
      }
    }
    return null;
  }, []);

  const performStagedUpload = useCallback(
    async (file: File) => {
      abortRef.current = false;
      setPhase('uploading');
      setProgress(0);
      setResolvedVideo(null);
      setStagedVideoToken(null);
      try {
        const { data: init } = await listingsApi.stagedVideoUploadInit({
          fileSize: file.size,
          fileName: file.name,
          contentType: file.type,
        });
        const partSize = init.partSizeBytes ?? listingVideoPartSizeDefault();
        const parts = await uploadListingVideoMultipart({
          file,
          parts: init.parts,
          partSizeBytes: partSize,
          onProgress: (r) => setProgress(Math.round(r * 70)),
        });
        if (abortRef.current) return false;
        const { data: complete } = await listingsApi.stagedVideoUploadComplete({
          stagedVideoToken: init.stagedVideoToken,
          uploadId: init.uploadId,
          parts,
        });
        setStagedVideoToken(complete.stagedVideoToken);
        setPhase('processing');
        setProgress(75);
        const readyToken = await pollStagedVideoUntilReady(complete.stagedVideoToken);
        if (abortRef.current) {
          return false;
        }
        if (!readyToken) {
          setPhase('failed');
          toast.error(t('listingForm.video.errors.uploadFailed'));
          return false;
        }
        setStagedVideoToken(readyToken);
        return true;
      } catch {
        if (abortRef.current) {
          return false;
        }
        setPhase('failed');
        toast.error(t('listingForm.video.errors.uploadFailed'));
        return false;
      }
    },
    [pollStagedVideoUntilReady, t],
  );

  const reset = useCallback(() => {
    abortRef.current = false;
    setPhase('idle');
    setProgress(0);
    setSelectedFile(null);
    setResolvedVideo(null);
    setStagedVideoToken(null);
    setPollListingId(listingId);
  }, [listingId]);

  const videoMaxSizeMb = Math.max(1, Math.floor(maxFileSizeBytes / (1024 * 1024)));
  const videoMaxDurationMin = Math.max(1, Math.ceil(maxDurationSec / 60));

  const uploadSelectedFile = useCallback(
    async (file: File) => {
      if (!validateVideoFile(file)) {
        return;
      }
      if (!listingId) {
        setSelectedFile(file);
        await performStagedUpload(file);
        return;
      }
      setSelectedFile(file);
      await performUpload(listingId, file, { toastOnFailure: true });
    },
    [listingId, performStagedUpload, performUpload, validateVideoFile],
  );

  const uploadVideoForListing = useCallback(
    async (targetListingId: string): Promise<boolean> => {
      const file = selectedFile;
      if (!file) {
        return true;
      }
      const ok = await performUpload(targetListingId, file, { toastOnFailure: false });
      return ok;
    },
    [performUpload, selectedFile],
  );

  const hasStagedVideo = phase === 'selected' && !!selectedFile;

  useEffect(() => {
    if (!pollListingId || phase !== 'processing') return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120;
    const id = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(id);
        if (!cancelled) setPhase('failed');
        return;
      }
      try {
        const one = await listingsApi.getOne(pollListingId);
        if (cancelled) return;
        const v = one.data.video;
        if (v?.status === 'published') {
          clearInterval(id);
          setResolvedVideo(v);
          setPhase('ready');
          setSelectedFile(null);
        } else if (v?.status === 'failed') {
          clearInterval(id);
          setPhase('failed');
        }
      } catch {
        /* ignore transient errors */
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollListingId, phase]);

  const removeVideo = useCallback(async () => {
    if (!listingId) {
      abortRef.current = true;
      setPhase('idle');
      setProgress(0);
      setSelectedFile(null);
      setResolvedVideo(null);
      setStagedVideoToken(null);
      return;
    }
    try {
      await listingsApi.deleteListingVideo(listingId);
      reset();
    } catch {
      toast.error(t('listingForm.video.errors.deleteFailed'));
    }
  }, [listingId, reset, t]);

  return {
    phase,
    progress,
    selectedFile,
    setSelectedFile,
    uploadSelectedFile,
    uploadVideoForListing,
    hasStagedVideo,
    removeVideo,
    resolvedVideo,
    stagedVideoToken,
    reset,
    videoMaxSizeMb,
    videoMaxDurationMin,
    abort: () => {
      abortRef.current = true;
    },
    blocksCreate:
      !listingId && (phase === 'uploading' || phase === 'processing' || phase === 'failed'),
    isReadyForCreate: !selectedFile || (!!stagedVideoToken && phase === 'ready'),
  };
}
