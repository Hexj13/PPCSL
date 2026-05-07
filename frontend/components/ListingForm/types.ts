import type { Brand, City, ListingVideoPayload, VehicleModel } from '@/lib/api';

import type { ListingFormData } from './listingFormTypes';

export interface ListingFormSectionProps {
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  errors: Record<string, boolean>;
  clearError: (_field: string) => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
  brands?: Brand[];
  models?: VehicleModel[];
  loadingModels?: boolean;
  cities?: City[];
  handleWheel?: (_e: React.WheelEvent<HTMLInputElement>) => void;
  siteConfig?: { currency: string };
  vehicleType?: 'car' | 'truck' | 'moto';
  onFormFieldFocus?: () => void;
  uploading?: boolean;
  onFileUpload?: (_files: File[]) => void;
  onImageDelete?: (_url: string) => void | Promise<void>;
  hidePlates?: boolean;
  onHidePlatesChange?: (_value: boolean) => void;
  deletingImageUrls?: string[];
  uploadSlots?: Array<{
    id: string;
    status: 'queued' | 'uploading';
    file: File;
    previewUrl: string;
    uploadedUrl?: string;
  }>;
  onUploadedImageLoaded?: (_slotId: string) => void;
  minPhotosRequired?: number;
  initialListingVideo?: ListingVideoPayload | null;
  videoPhase?: 'idle' | 'selected' | 'uploading' | 'processing' | 'ready' | 'failed';
  videoProgress?: number;
  onVideoFileSelected?: (_file: File) => void;
  onVideoRemove?: () => void | Promise<void>;
  listingVideoResolved?: ListingVideoPayload | null;
  videoMaxSizeMb?: number;
  videoMaxDurationMin?: number;
  selectedVideoFileName?: string | null;
}
