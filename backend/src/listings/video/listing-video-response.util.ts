import { buildPublicMediaUrl } from '../../upload/upload.service';
import type { Listing } from '../entities/listing.entity';

export function buildListingVideoForGetListing(
  listing: Listing,
  viewerUserId: string | null | undefined,
  isAdmin: boolean | undefined,
): void {
  const raw = listing.video;
  (listing as Listing & { has_video?: boolean }).has_video = raw?.status === 'published';

  if (!raw) {
    (listing as { video?: unknown }).video = null;
    return;
  }

  const isOwner = !!(viewerUserId && listing.user_id === viewerUserId);
  const canSeeInternals = isOwner || !!isAdmin;

  if (raw.status === 'published') {
    (listing as { video?: unknown }).video = {
      status: raw.status,
      webmUrl: raw.webmKey ? buildPublicMediaUrl(raw.webmKey) : null,
      mp4Url: raw.mp4Key ? buildPublicMediaUrl(raw.mp4Key) : null,
      thumbUrl: raw.thumbKey ? buildPublicMediaUrl(raw.thumbKey) : null,
      durationSec: raw.durationSec ?? null,
    };
    return;
  }

  if (canSeeInternals) {
    (listing as { video?: unknown }).video = {
      status: raw.status,
      error: raw.error ?? null,
      jobId: raw.jobId ?? null,
      uploadedAt: raw.uploadedAt ?? null,
    };
    return;
  }

  (listing as { video?: unknown }).video = null;
}
