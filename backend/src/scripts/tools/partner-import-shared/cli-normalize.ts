import { ListingStatus, RegistrationType } from '../../../common/types';

import type { CliStatus, RuntimeEnv } from './platform-import-types';

export function normalizeRuntimeEnv(value?: string): RuntimeEnv {
  if (!value) {
    return 'local';
  }
  if (value === 'prod' || value === 'local') {
    return value;
  }
  throw new Error(`Invalid env "${value}". Allowed: local|prod.`);
}

export function normalizeCliStatus(value?: string): CliStatus {
  if (!value) {
    return 'paused';
  }
  if (value === 'active' || value === 'paused') {
    return value;
  }
  throw new Error(`Invalid status "${value}". Allowed: active|paused.`);
}

export function mapCliStatusToListingStatus(status: CliStatus): ListingStatus {
  return status === 'active' ? ListingStatus.Active : ListingStatus.Paused;
}

export function normalizeRegistrationType(value?: string): RegistrationType {
  if (!value) {
    return RegistrationType.Cleared;
  }
  const allowed: Record<string, RegistrationType> = {
    local: RegistrationType.Local,
    foreign: RegistrationType.Foreign,
    cleared: RegistrationType.Cleared,
    Local: RegistrationType.Local,
    Foreign: RegistrationType.Foreign,
    Cleared: RegistrationType.Cleared,
  };

  const normalized = allowed[value];
  if (!normalized) {
    throw new Error(`Invalid registration type "${value}". Allowed: Local|Foreign|Cleared.`);
  }
  return normalized;
}
