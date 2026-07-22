'use client';

import type { ReactNode } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
import type { User } from '@/lib/api';
import { EditIcon, EyeIcon } from '@/ui';

import {
  getPartnerBalance,
  getPartnerListingsUntilNext,
  getTypeLabelKey,
  hasContactInfo,
  isBusinessUser,
} from './adminUsersHelpers';

type AdminUserCardField = { key: string; label: string; value: ReactNode };

function UserCardFieldRow({ field }: { field: AdminUserCardField }) {
  return (
    <div className="min-w-0">
      <span className="text-primary-700">{field.label}</span>{' '}
      <span className="wrap-break-word inline" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
        {field.value}
      </span>
    </div>
  );
}

function partnerFieldsForUser(user: User, t: AdminUserCardProps['t']): AdminUserCardField[] {
  if (!isBusinessUser(user)) {
    return [];
  }
  const rows: AdminUserCardField[] = [
    {
      key: 'partner',
      label: t('admin.usersTab.platformPartner'),
      value: user.isPlatformPartner ? t('common.yes') : t('common.no'),
    },
  ];
  if (!user.isPlatformPartner) {
    return rows;
  }
  return [
    ...rows,
    {
      key: 'partnerBalance',
      label: t('admin.usersTab.freePromotionBalance'),
      value: String(getPartnerBalance(user)),
    },
    {
      key: 'partnerProgress',
      label: t('admin.usersTab.partnerProgress'),
      value: t('admin.usersTab.partnerProgressValue', {
        count: getPartnerListingsUntilNext(user),
      }),
    },
  ];
}

export interface AdminUserCardProps {
  user: User;
  t: (key: string, params?: Record<string, string | number>) => string;
  onViewListings: (user: User) => void;
  onToggleStatus: (userId: string) => void;
  onEdit: (user: User) => void;
}

export function AdminUserCard({
  user,
  t,
  onViewListings,
  onToggleStatus,
  onEdit,
}: AdminUserCardProps) {
  const listingCount = user.listings?.length ?? 0;
  const canToggleStatus = hasContactInfo(user);
  const unavailable = t('admin.usersTab.unavailable');
  const websiteUrl = user.companyWebsiteUrl?.trim();

  const identityFields: AdminUserCardField[] = isBusinessUser(user)
    ? [
        {
          key: 'companyName',
          label: t('admin.usersTab.companyName'),
          value: user.companyName?.trim() || unavailable,
        },
        {
          key: 'companyWebsite',
          label: t('admin.usersTab.companyWebsite'),
          value: websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-text-secondary hover-only:hover:text-primary-700 transition-colors"
            >
              {websiteUrl}
            </a>
          ) : (
            unavailable
          ),
        },
      ]
    : [
        {
          key: 'firstName',
          label: t('admin.usersTab.firstName'),
          value: user.firstName?.trim() || unavailable,
        },
        {
          key: 'lastName',
          label: t('admin.usersTab.lastName'),
          value: user.lastName?.trim() || unavailable,
        },
      ];

  const emailTrimmed = user.email?.trim();
  const leftColumnFields: AdminUserCardField[] = [
    ...identityFields,
    {
      key: 'email',
      label: t('admin.usersTab.email'),
      value: user.email || unavailable,
    },
    ...(emailTrimmed
      ? [
          {
            key: 'emailVerifiedStatus',
            label: t('admin.usersTab.emailVerifiedStatus'),
            value: user.emailVerified === true ? t('common.yes') : t('common.no'),
          },
        ]
      : []),
    {
      key: 'phone',
      label: t('admin.usersTab.phone'),
      value: user.phone || unavailable,
    },
  ];

  const rightColumnFields: AdminUserCardField[] = [
    {
      key: 'type',
      label: t('admin.usersTab.type'),
      value: t(getTypeLabelKey(user.type)),
    },
    {
      key: 'listings',
      label: t('admin.usersTab.listings'),
      value: String(listingCount),
    },
    ...partnerFieldsForUser(user, t),
  ];

  return (
    <div className="card p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm md:text-base text-text-secondary font-mono break-all">
          {t('admin.usersTab.id')} {user.id}
        </span>
        <CopyButton text={user.id} label="ID" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3 text-sm md:text-base">
        <div className="flex flex-col gap-y-3 min-w-0">
          {leftColumnFields.map((field) => (
            <UserCardFieldRow key={field.key} field={field} />
          ))}
        </div>
        <div className="flex flex-col gap-y-3 min-w-0">
          {rightColumnFields.map((field) => (
            <UserCardFieldRow key={field.key} field={field} />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-primary-500/20">
        <div className="flex flex-col xl:flex-row xl:justify-between items-start xl:items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <div className="text-base font-semibold text-primary-900">
              {t('admin.usersTab.status')}
            </div>
            <div
              className={`font-bold text-base ${
                user.active !== false ? 'text-primary-500' : 'text-red-500'
              }`}
            >
              {user.active !== false ? t('admin.usersTab.active') : t('admin.usersTab.inactive')}
            </div>
          </div>
          <div className="flex flex-col lg:flex-col xl:flex-row xl:flex-wrap xl:justify-end items-stretch xl:items-center gap-2 w-full xl:flex-1 xl:min-w-0">
            {listingCount > 0 ? (
              <button
                onClick={() => onViewListings(user)}
                className="text-text-secondary font-medium text-sm hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-blue-500/40 hover-only:hover:border-blue-500/60 bg-blue-500/20 select-none w-full xl:w-auto h-10"
              >
                <EyeIcon className="w-4 h-4 shrink-0" />
                {t('admin.usersTab.viewListings')}
              </button>
            ) : (
              <div
                className="invisible pointer-events-none w-full xl:w-auto h-10 shrink-0 rounded-lg border-2 border-transparent px-3 md:px-4 py-1.5 md:py-2"
                aria-hidden
              />
            )}
            <button
              type="button"
              disabled={!canToggleStatus}
              onClick={() => onToggleStatus(user.id)}
              className={`font-medium text-sm transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 select-none w-full xl:w-auto h-10 disabled:opacity-50 disabled:cursor-not-allowed ${
                !canToggleStatus
                  ? 'text-text-secondary border-primary-500/20 bg-bg-secondary/40'
                  : user.active !== false
                    ? 'text-text-secondary hover-only:hover:text-text-primary border-red-500/40 hover-only:hover:border-red-500/60 bg-red-500/20 hover-only:hover:bg-red-500/30'
                    : 'text-primary-700 hover-only:hover:text-primary-900 border-primary-700 hover-only:hover:border-primary-900 bg-primary-500/10'
              }`}
            >
              {user.active !== false
                ? t('admin.usersTab.deactivate')
                : t('admin.usersTab.activate')}
            </button>
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="text-primary-700 font-medium text-sm hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none w-full xl:w-auto h-10"
            >
              <EditIcon className="w-4 h-4 shrink-0" />
              {t('common.edit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
