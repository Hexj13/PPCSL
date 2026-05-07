import type { UploadClient } from '../api/upload-client';

export async function maybeImportPartnerListingVideo(params: {
  videoUrl?: string | null;
  listingId: string;
  uploadClient: UploadClient;
  sourceId: string;
  logger: { warn: (_scope: string, _msg: string) => void };
}): Promise<void> {
  const trimmed = params.videoUrl?.trim();
  if (!trimmed) return;
  try {
    await params.uploadClient.uploadVideoFromUrl(trimmed, params.listingId);
  } catch (error) {
    params.logger.warn('IMPORT', `[VIDEO][${params.sourceId}] ${String(error)}`);
  }
}
