'use client';

import type {
  AdminEditUserFieldKey,
  AdminEditUserFormState,
  AdminEditUserFormTouchedKey,
} from '@/app/admin/components/adminEditUserFormValidation';
import { isBusinessUser } from '@/app/admin/components/adminUsersHelpers';
import { Modal } from '@/components/modals/Modal';
import type { User } from '@/lib/api';
import { Checkbox } from '@/ui';

import { AdminActionButton } from './AdminButtons';

const inputBaseClassName = 'input-field w-full';

const inputErrorRingClass = 'border-red-500 focus:border-red-500 focus:ring-red-500';

function inputClassForField(
  fieldKey: AdminEditUserFieldKey,
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>,
  extra?: string,
): string {
  const err = fieldMessages[fieldKey];
  return [inputBaseClassName, err ? inputErrorRingClass : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
}

function formatFieldLabel(label: string, stripColon: boolean): string {
  return stripColon ? label.replace(/:\s*$/, '') : label;
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
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-email"
              >
                {formatFieldLabel(t('admin.usersTab.email'), false)}
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
          </>
        )}

        {business && (
          <>
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-companyName"
              >
                {formatFieldLabel(t('admin.usersTab.companyName'), true)}
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
                {formatFieldLabel(t('admin.usersTab.companyWebsite'), true)}
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
                {formatFieldLabel(t('profile.additionalPhone'), true)}
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
            <div>
              <label
                className="block text-sm font-medium text-primary-900 mb-1"
                htmlFor="admin-edit-email"
              >
                {formatFieldLabel(t('admin.usersTab.email'), true)}
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
                {formatFieldLabel(t('admin.usersTab.freePromotionBalance'), true)}
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

        <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0">
          <AdminActionButton
            variant="secondary"
            className="w-full shrink-0 sm:flex-1"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton
            className="w-full shrink-0 sm:flex-1"
            onClick={onSubmit}
            disabled={saving}
          >
            {saving ? t('common.loading') : t('common.save')}
          </AdminActionButton>
        </div>
      </div>
    </Modal>
  );
}
