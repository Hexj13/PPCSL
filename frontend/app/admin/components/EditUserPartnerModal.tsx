'use client';

import type {
  AdminEditUserFieldKey,
  AdminEditUserFormState,
  AdminEditUserFormTouchedKey,
} from '@/app/admin/components/adminEditUserFormValidation';
import { isBusinessUser } from '@/app/admin/components/adminUsersHelpers';
import { CopyButton } from '@/components/common/CopyButton';
import { Modal } from '@/components/modals/Modal';
import type { User } from '@/lib/api';
import { Checkbox } from '@/ui';

const inputClassName =
  'w-full px-4 py-2.5 rounded-lg border-2 bg-bg-secondary text-text-primary focus:outline-hidden focus:border-primary-900 border-primary-700';

const inputErrorRingClass = 'border-red-500 focus:border-red-500 focus:ring-red-500';

function inputClassForField(
  fieldKey: AdminEditUserFieldKey,
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>,
  extra?: string,
): string {
  const err = fieldMessages[fieldKey];
  return [inputClassName, err ? inputErrorRingClass : '', extra ?? ''].filter(Boolean).join(' ');
}

export function EditUserPartnerModal({
  user,
  isOpen,
  saving,
  formState,
  fieldMessages,
  onClose,
  onFormChange,
  onSubmit,
  t,
}: {
  user: User | null;
  isOpen: boolean;
  saving: boolean;
  formState: AdminEditUserFormState;
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>;
  onClose: () => void;
  onFormChange: (value: AdminEditUserFormState, field: AdminEditUserFormTouchedKey) => void;
  onSubmit: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!user) return null;

  const business = isBusinessUser(user);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={t('admin.usersTab.editUser')}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center min-w-0">
          <span className="font-semibold text-primary-700 shrink-0">{t('admin.usersTab.id')}</span>
          <span className="ml-2 text-sm font-mono break-all min-w-0 text-text-secondary">
            {user.id}
          </span>
          <CopyButton
            text={user.id}
            label={t('admin.usersTab.id')}
            successMessageKey="listingDetail.copied"
            errorMessageKey="listingDetail.copyError"
            title={t('common.copyId')}
            className="ml-2"
            iconClassName="w-4 h-4"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-primary-900 mb-1"
            htmlFor="admin-edit-email"
          >
            {t('admin.usersTab.email')}
          </label>
          <input
            id="admin-edit-email"
            type="email"
            autoComplete="off"
            value={formState.email}
            onChange={(e) => {
              const email = e.target.value;
              onFormChange(
                {
                  ...formState,
                  email,
                  emailVerified: email.trim() === '' ? false : formState.emailVerified,
                },
                'email',
              );
            }}
            className={inputClassForField('email', fieldMessages)}
          />
          {fieldMessages.email ? (
            <p className="mt-1 text-sm text-red-500">{fieldMessages.email}</p>
          ) : null}
          <div className="mt-2">
            <Checkbox
              checked={formState.emailVerified}
              disabled={formState.email.trim() === ''}
              onChange={(checked) =>
                onFormChange({ ...formState, emailVerified: checked }, 'emailVerified')
              }
              label={t('admin.usersTab.emailVerified')}
              size="sm"
            />
          </div>
        </div>

        {!business && (
          <>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-firstName"
              >
                {t('admin.usersTab.firstName')}
              </label>
              <input
                id="admin-edit-firstName"
                type="text"
                autoComplete="off"
                value={formState.firstName}
                onChange={(e) =>
                  onFormChange({ ...formState, firstName: e.target.value }, 'firstName')
                }
                className={inputClassForField('firstName', fieldMessages)}
              />
              {fieldMessages.firstName ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.firstName}</p>
              ) : null}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-lastName"
              >
                {t('admin.usersTab.lastName')}
              </label>
              <input
                id="admin-edit-lastName"
                type="text"
                autoComplete="off"
                value={formState.lastName}
                onChange={(e) =>
                  onFormChange({ ...formState, lastName: e.target.value }, 'lastName')
                }
                className={inputClassForField('lastName', fieldMessages)}
              />
              {fieldMessages.lastName ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.lastName}</p>
              ) : null}
            </div>
          </>
        )}

        {business && (
          <>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-companyName"
              >
                {t('admin.usersTab.companyName')}
              </label>
              <input
                id="admin-edit-companyName"
                type="text"
                autoComplete="off"
                value={formState.companyName}
                onChange={(e) =>
                  onFormChange({ ...formState, companyName: e.target.value }, 'companyName')
                }
                className={inputClassForField('companyName', fieldMessages)}
              />
              {fieldMessages.companyName ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.companyName}</p>
              ) : null}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-companyWebsite"
              >
                {t('admin.usersTab.companyWebsite')}
              </label>
              <input
                id="admin-edit-companyWebsite"
                type="url"
                autoComplete="off"
                placeholder="https://"
                value={formState.companyWebsiteUrl}
                onChange={(e) =>
                  onFormChange(
                    { ...formState, companyWebsiteUrl: e.target.value },
                    'companyWebsiteUrl',
                  )
                }
                className={inputClassForField('companyWebsiteUrl', fieldMessages)}
              />
              {fieldMessages.companyWebsiteUrl ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.companyWebsiteUrl}</p>
              ) : null}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-additionalPhone"
              >
                {t('profile.additionalPhone')}
              </label>
              <input
                id="admin-edit-additionalPhone"
                type="tel"
                autoComplete="off"
                value={formState.additionalPhone}
                onChange={(e) =>
                  onFormChange({ ...formState, additionalPhone: e.target.value }, 'additionalPhone')
                }
                className={inputClassForField('additionalPhone', fieldMessages)}
              />
              {fieldMessages.additionalPhone ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.additionalPhone}</p>
              ) : null}
            </div>
          </>
        )}

        {business && (
          <>
            <Checkbox
              checked={formState.isPlatformPartner}
              onChange={(checked) =>
                onFormChange(
                  {
                    ...formState,
                    isPlatformPartner: checked,
                    freePromotionBalance: checked ? formState.freePromotionBalance : '0',
                  },
                  'isPlatformPartner',
                )
              }
              label={t('admin.usersTab.isPartnerCheckbox')}
              size="sm"
            />

            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                {t('admin.usersTab.freePromotionBalance')}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={formState.freePromotionBalance}
                onChange={(e) =>
                  onFormChange(
                    {
                      ...formState,
                      freePromotionBalance: e.target.value,
                    },
                    'freePromotionBalance',
                  )
                }
                disabled={!formState.isPlatformPartner}
                className={inputClassForField(
                  'freePromotionBalance',
                  fieldMessages,
                  !formState.isPlatformPartner ? 'cursor-not-allowed opacity-50' : '',
                )}
              />
              {fieldMessages.freePromotionBalance ? (
                <p className="mt-1 text-sm text-red-500">{fieldMessages.freePromotionBalance}</p>
              ) : null}
              {!formState.isPlatformPartner ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {t('admin.usersTab.freePromotionBalanceDisabledHint')}
                </p>
              ) : null}
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-700 bg-primary-500/10 text-primary-700 font-semibold text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
