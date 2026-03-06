import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';

import { uploadApi } from '@/lib/api';

import type { ListingFormData } from '../ListingForm';

import { useListingFormImages } from './useListingFormImages';

jest.mock('@/lib/api', () => ({
  uploadApi: {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  },
}));

const mockT = (key: string) => key;

describe('useListingFormImages', () => {
  const createDeferred = <T>() => {
    let resolve!: (_value: T) => void;
    let reject!: (_reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: jest.fn(() => 'slot-id'),
      },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn(() => 'blob:test-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should revoke preview URL and clear slots on reset', async () => {
    const deferred = createDeferred<{
      data: { url: string; path: string; deleteToken: string };
    }>();
    (uploadApi.uploadImage as jest.Mock).mockReturnValue(deferred.promise);

    const setFormData = jest.fn();
    const { result } = renderHook(() =>
      useListingFormImages({
        t: mockT,
        setFormData: setFormData as unknown as Dispatch<SetStateAction<ListingFormData>>,
      }),
    );

    await act(async () => {
      result.current.handleFileUpload([new File(['x'], 'test.jpg', { type: 'image/jpeg' })], 0);
    });

    expect(result.current.uploadSlots).toHaveLength(1);
    expect(result.current.uploading).toBe(true);

    act(() => {
      result.current.resetUploadedImagesState();
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-preview');
    expect(result.current.uploadSlots).toHaveLength(0);
    expect(result.current.uploading).toBe(false);
  });

  it('should revoke preview URL on unmount while upload is in progress', async () => {
    const deferred = createDeferred<{
      data: { url: string; path: string; deleteToken: string };
    }>();
    (uploadApi.uploadImage as jest.Mock).mockReturnValue(deferred.promise);

    const setFormData = jest.fn();
    const { result, unmount } = renderHook(() =>
      useListingFormImages({
        t: mockT,
        setFormData: setFormData as unknown as Dispatch<SetStateAction<ListingFormData>>,
      }),
    );

    await act(async () => {
      result.current.handleFileUpload([new File(['x'], 'test.jpg', { type: 'image/jpeg' })], 0);
    });

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-preview');
  });
});
