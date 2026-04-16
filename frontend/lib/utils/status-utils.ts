import type { ListingStatus } from '../types';

export interface StatusConfig {
  labelKey: string;
  textColor: string;
  bgColor: string;
  borderColor?: string;
}

export const STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  Active: {
    labelKey: 'userListings.active',
    textColor: 'text-primary-400',
    bgColor: 'bg-primary-500/20',
    borderColor: 'border-primary-500/40',
  },
  Paused: {
    labelKey: 'userListings.paused',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
  },
  Closed: {
    labelKey: 'userListings.closed',
    textColor: 'text-gray-200',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/40',
  },
};

export function getStatusConfig(status: ListingStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
