import { Brand, Model } from '@/lib/api';

import { ListingFormData } from '../ListingForm';

export interface ListingFormSectionProps {
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  errors: Record<string, boolean>;
  clearError: (_field: string) => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
  brands?: Brand[];
  models?: Model[];
  loadingModels?: boolean;
  cities?: Array<{ id: string; name: string }>;
  showVinHint?: boolean;
  setShowVinHint?: (_show: boolean) => void;
  handleWheel?: (_e: React.WheelEvent<HTMLInputElement>) => void;
  siteConfig?: { currency: string };
}
