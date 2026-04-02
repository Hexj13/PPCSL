import type { Dispatch, SetStateAction } from 'react';

import { getSubmitErrorMessage } from '@/components/ListingForm/submitHelpers';
import { toast } from '@/lib/toast';

import type { ListingFormData } from './listingFormTypes';

const ASSIGNED_USER_ERROR_KEYS: string[] = [
  'errors.userNotFound',
  'errors.assignedUserDeactivated',
  'errors.activeListingsLimitExceeded',
  'errors.invalidUserId',
];

export function handleVehicleListingSubmitApiError(
  error: unknown,
  formData: ListingFormData,
  mode: 'create' | 'edit',
  t: (key: string, values?: Record<string, string | number>) => string,
  setErrors: Dispatch<SetStateAction<Record<string, boolean>>>,
  afterHidden: (fn: () => void) => void,
): void {
  const axiosError = error as {
    response?: { data?: { message?: string; errorKey?: string } };
  };
  const backendMessage =
    typeof axiosError?.response?.data?.message === 'string' ? axiosError.response.data.message : '';
  const backendErrorKey = axiosError?.response?.data?.errorKey;
  const isAssignError =
    Boolean(formData.assignedUserId?.trim()) &&
    (typeof backendErrorKey === 'string'
      ? ASSIGNED_USER_ERROR_KEYS.includes(backendErrorKey)
      : ASSIGNED_USER_ERROR_KEYS.some((key) => backendMessage.includes(key)));

  if (isAssignError) {
    setErrors((prev) => ({ ...prev, assignedUserId: true }));
    afterHidden(() => toast.error(backendMessage || getSubmitErrorMessage(error, mode, t)));
  } else {
    afterHidden(() => toast.error(getSubmitErrorMessage(error, mode, t)));
  }
}
