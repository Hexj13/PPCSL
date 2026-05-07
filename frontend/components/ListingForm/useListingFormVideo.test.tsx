import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getListingVideoConstraints: jest.fn(),
    videoUploadInit: jest.fn(),
    videoUploadComplete: jest.fn(),
    stagedVideoUploadInit: jest.fn(),
    stagedVideoUploadComplete: jest.fn(),
    getStagedVideoStatus: jest.fn(),
    deleteListingVideo: jest.fn(),
    getOne: jest.fn(),
  },
}));

import { listingsApi } from '@/lib/api';
import { toast } from '@/lib/toast';

import { useListingFormVideo } from './useListingFormVideo';

const t = (key: string) => key;

describe('useListingFormVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listingsApi.getListingVideoConstraints as jest.Mock).mockImplementation(async () => ({
      data: {
        maxFileSizeBytes: 314572800,
        maxDurationSec: 180,
        partSizeBytes: 5242880,
        allowedContentTypes: ['video/mp4'],
      },
    }));
  });

  it('fetches constraints on mount even without listingId', async () => {
    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: undefined, initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });
    expect(result.current.videoMaxSizeMb).toBe(300);
    expect(result.current.videoMaxDurationMin).toBe(3);
  });

  it('fetches constraints when listingId is present', async () => {
    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: 'listing-a', initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });
    expect(result.current.videoMaxSizeMb).toBe(300);
  });

  it('uploads and transcodes staged video without listingId', async () => {
    (listingsApi.stagedVideoUploadInit as jest.Mock).mockResolvedValue({
      data: {
        uploadId: 'up-staged',
        stagedVideoToken: 'pending-token',
        parts: [{ partNumber: 1, url: 'https://example.com/p1' }],
        partSizeBytes: 5242880,
      },
    });
    (listingsApi.stagedVideoUploadComplete as jest.Mock).mockResolvedValue({
      data: { jobId: 'job-staged', stagedVideoToken: 'processing-token' },
    });
    (listingsApi.getStagedVideoStatus as jest.Mock).mockResolvedValue({
      data: {
        status: 'published',
        progress: 100,
        stagedVideoToken: 'ready-token',
        video: { status: 'published', mp4Url: '/v.mp4', thumbUrl: '/t.webp' },
      },
    });
    global.XMLHttpRequest = class {
      public status = 200;
      open() {}
      send() {
        if (this.onload) this.onload({} as ProgressEvent);
      }
      getResponseHeader() {
        return '"abc123"';
      }
      onload: ((ev: ProgressEvent) => void) | null = null;
      onerror: ((ev: ProgressEvent) => void) | null = null;
    } as unknown as typeof XMLHttpRequest;

    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: undefined, initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' });
    jest.useFakeTimers();
    await act(async () => {
      const upload = result.current.uploadSelectedFile(file);
      await jest.advanceTimersByTimeAsync(5000);
      await upload;
    });
    jest.useRealTimers();

    expect(listingsApi.videoUploadInit).not.toHaveBeenCalled();
    expect(listingsApi.stagedVideoUploadInit).toHaveBeenCalled();
    expect(listingsApi.stagedVideoUploadComplete).toHaveBeenCalled();
    expect(result.current.phase).toBe('ready');
    expect(result.current.stagedVideoToken).toBe('ready-token');
    expect(result.current.isReadyForCreate).toBe(true);
  });

  it('uploads immediately when listingId is present', async () => {
    (listingsApi.videoUploadInit as jest.Mock).mockResolvedValue({
      data: {
        uploadId: 'up-1',
        parts: [{ partNumber: 1, url: 'https://example.com/p1' }],
        partSizeBytes: 5242880,
      },
    });
    (listingsApi.videoUploadComplete as jest.Mock).mockResolvedValue({ data: { jobId: 'job-1' } });

    global.XMLHttpRequest = class {
      public status = 200;
      public responseHeaders = 'etag';
      open() {}
      setRequestHeader() {}
      send() {
        setTimeout(() => {
          if (this.onload) this.onload({} as ProgressEvent);
        }, 0);
      }
      getResponseHeader() {
        return '"abc123"';
      }
      onload: ((ev: ProgressEvent) => void) | null = null;
      onerror: ((ev: ProgressEvent) => void) | null = null;
    } as unknown as typeof XMLHttpRequest;

    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: 'listing-a', initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' });
    await act(async () => {
      await result.current.uploadSelectedFile(file);
    });

    await waitFor(() => {
      expect(listingsApi.videoUploadInit).toHaveBeenCalledWith(
        'listing-a',
        expect.objectContaining({
          fileName: 'clip.mp4',
          contentType: 'video/mp4',
        }),
      );
    });
    expect(listingsApi.videoUploadComplete).toHaveBeenCalled();
  });

  it('does not start upload when file MIME type is not allowed', async () => {
    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: undefined, initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });
    const file = new File([new Uint8Array([1])], 'clip.wmv', { type: 'video/x-ms-wmv' });
    await act(async () => {
      await result.current.uploadSelectedFile(file);
    });
    expect(toast.error).toHaveBeenCalledWith('listingForm.video.errors.invalidType');
    expect(listingsApi.stagedVideoUploadInit).not.toHaveBeenCalled();
  });

  it('does not start upload when file exceeds max size from constraints', async () => {
    (listingsApi.getListingVideoConstraints as jest.Mock).mockImplementation(async () => ({
      data: {
        maxFileSizeBytes: 1000,
        maxDurationSec: 180,
        partSizeBytes: 5242880,
        allowedContentTypes: ['video/mp4'],
      },
    }));
    const { result } = renderHook(() =>
      useListingFormVideo({ t, listingId: undefined, initialListingVideo: null }),
    );
    await waitFor(() => {
      expect(listingsApi.getListingVideoConstraints).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.videoMaxSizeMb).toBe(1);
    });
    const payload = new Uint8Array(1001);
    const file = new File([payload], 'clip.mp4', { type: 'video/mp4' });
    await act(async () => {
      await result.current.uploadSelectedFile(file);
    });
    expect(toast.error).toHaveBeenCalledWith('listingForm.video.errors.tooLarge');
    expect(listingsApi.stagedVideoUploadInit).not.toHaveBeenCalled();
  });
});
