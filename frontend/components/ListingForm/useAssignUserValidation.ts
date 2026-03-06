import { useEffect, useState, useRef } from 'react';

import { api } from '@/lib/api';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEBOUNCE_MS = 600;

const backendErrorToFrontendKey: Record<string, string> = {
  'errors.userNotFound': 'listings.userNotFound',
  'errors.assignedUserDeactivated': 'listings.assignedUserDeactivated',
  'errors.activeListingsLimitExceeded': 'listings.activeListingsLimitExceeded',
};

interface ValidUser {
  id: string;
  displayName: string;
  type: string;
  activeListings: number;
  listingLimit: number;
}

export interface AssignUserValidationState {
  status: 'idle' | 'loading' | 'valid' | 'error';
  user?: ValidUser;
  errorKey?: string;
}

export function useAssignUserValidation(rawValue: string): AssignUserValidationState {
  const [state, setState] = useState<AssignUserValidationState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const value = rawValue.trim();

  useEffect(() => {
    abortRef.current?.abort();

    if (!value) {
      setState({ status: 'idle' });
      return;
    }

    if (!UUID_V4_REGEX.test(value)) {
      setState({ status: 'error', errorKey: 'listings.invalidUserId' });
      return;
    }

    setState({ status: 'loading' });

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await api.get<{
          valid: boolean;
          user?: ValidUser;
          error?: string;
        }>(`/api/admin/validate-assign-user/${value}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const data = res.data;
        if (data.valid && data.user) {
          setState({ status: 'valid', user: data.user });
        } else {
          const frontendErrorKey =
            backendErrorToFrontendKey[data.error as keyof typeof backendErrorToFrontendKey] ??
            'listings.invalidUserId';
          setState({
            status: 'error',
            errorKey: frontendErrorKey,
          });
        }
      } catch (err: unknown) {
        if ((err as Error & { name?: string })?.name === 'CanceledError') return;
        if ((err as Error & { code?: string })?.code === 'ERR_CANCELED') return;
        setState({ status: 'error', errorKey: 'listings.invalidUserId' });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value]);

  return state;
}
