export type ListingVideoStatus = 'pending' | 'processing' | 'published' | 'failed';

export interface ListingVideoJson {
  status: ListingVideoStatus;
  uploadId?: string | null;
  inputKey?: string | null;
  outputPrefix?: string | null;
  webmKey?: string | null;
  mp4Key?: string | null;
  thumbKey?: string | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
  uploadedAt?: string | null;
  processedAt?: string | null;
  jobId?: string | null;
  error?: string | null;
}

export interface ListingVideoPublic {
  status: ListingVideoStatus;
  webmUrl?: string | null;
  mp4Url?: string | null;
  thumbUrl?: string | null;
  durationSec?: number | null;
}
