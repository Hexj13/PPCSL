'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { ClockIcon, InfoBlock } from '@/ui';

import { AdminActionButton } from '../AdminButtons';

import { ParsingAssignedUserField } from './ParsingAssignedUserField';
import { ParsingScheduleModalPdpConfig } from './ParsingScheduleModalPdpConfig';
import { ParsingScheduleModalPlpConfig } from './ParsingScheduleModalPlpConfig';
import { modalFieldLabelClassName, modalInputClassName } from './parsing-tab-constants';
import {
  getDefaultPdpCity,
  getDefaultPlpScanMode,
  getParserPdpDefaults,
} from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingScheduleModal(c: ParsingTabControllerState) {
  const { t, catalog, forms, schedules } = c;
  const { catalogLoading, schedulerParserOptions, cities } = catalog;
  const {
    scheduleForm,
    setScheduleForm,
    scheduleTimezoneOptions,
    scheduleWeekdayOptions,
    selectedScheduleParserLabel,
    schedulePdpPlpFileOptions,
    schedulePdpPlpFileSelectDisabled,
    scheduleAssignValidation,
    schedulePdpSyncHintLoading,
    schedulePdpSyncHint,
    shouldShowSchedulePresetTimeField,
    shouldShowScheduleTimezoneField,
    canEditSchedulePresetTime,
    canEditScheduleTimezone,
  } = forms;
  const {
    scheduleModalOpen,
    closeScheduleModal,
    submitSchedule,
    scheduleSubmitDisabled,
    scheduleCreating,
    editingSchedule,
  } = schedules;
  return (
    <Modal
      isOpen={scheduleModalOpen}
      onClose={closeScheduleModal}
      title={
        editingSchedule
          ? t('admin.parsing.scheduleModalTitleEdit')
          : t('admin.parsing.scheduleModalTitle')
      }
      size="large"
    >
      <div className="space-y-4">
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldRunType')}</label>
          <Dropdown
            value={scheduleForm.runType}
            onChange={(value) => {
              const runType = value as 'plp' | 'pdp';
              setScheduleForm((s) => {
                const next = {
                  ...s,
                  runType,
                  assignedUserId: runType === 'pdp' ? s.assignedUserId : '',
                };
                if (runType === 'pdp' && !s.pdpCity.trim()) {
                  next.pdpCity = getDefaultPdpCity(s.parserCode, cities);
                }
                return next;
              });
            }}
            options={[
              { value: 'plp', label: t('admin.parsing.subtabPlp') },
              { value: 'pdp', label: t('admin.parsing.subtabPdp') },
            ]}
            disabled={Boolean(editingSchedule)}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
          {schedulerParserOptions.length <= 1 ? (
            <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
              {selectedScheduleParserLabel}
            </div>
          ) : (
            <Dropdown
              value={scheduleForm.parserCode}
              onChange={(value) =>
                setScheduleForm((s) => {
                  const pdpDefaults = getParserPdpDefaults(value);
                  return {
                    ...s,
                    parserCode: value,
                    plpScanMode: getDefaultPlpScanMode(value),
                    plpPagesFirst: 1,
                    plpPageFrom: 1,
                    plpPageTo: 1,
                    plpLogin: '',
                    plpPageSize: 50,
                    plpMaxItems: '',
                    pdpPlpFileKey: '',
                    pdpListingStatus: pdpDefaults.listingStatus,
                    pdpRegistrationType: pdpDefaults.registrationType,
                    pdpDefaultHp: pdpDefaults.defaultHp,
                    pdpCity: getDefaultPdpCity(value, cities),
                    pdpDelayMs: pdpDefaults.delayMs,
                    pdpRemoveClosed: pdpDefaults.removeClosed,
                    pdpOnlyFailed: pdpDefaults.onlyFailed,
                    pdpUpdateExisting: pdpDefaults.updateExisting,
                    pdpCheckUserDuplicatesBeforeCreate: false,
                    pdpAutoCreateBrands: pdpDefaults.autoCreateBrands,
                    pdpAutoCreateModels: pdpDefaults.autoCreateModels,
                  };
                })
              }
              options={schedulerParserOptions}
              disabled={catalogLoading || Boolean(editingSchedule)}
              renderMenuInPortal
              className="w-full"
            />
          )}
        </div>
        {scheduleForm.runType === 'pdp' && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPlpFile')}</label>
            <Dropdown
              value={scheduleForm.pdpPlpFileKey}
              onChange={(value) => setScheduleForm((s) => ({ ...s, pdpPlpFileKey: value }))}
              options={
                schedulePdpPlpFileOptions.length > 0
                  ? schedulePdpPlpFileOptions.map((item) => ({
                      value: item.key,
                      label: item.fileName,
                    }))
                  : [{ value: '', label: '—' }]
              }
              disabled={schedulePdpPlpFileSelectDisabled}
              renderMenuInPortal
              className="w-full"
            />
          </div>
        )}
        {scheduleForm.runType === 'pdp' &&
          (editingSchedule ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldAssignedUserId')}
                </label>
              </div>
              <input
                type="text"
                value={scheduleForm.assignedUserId}
                readOnly
                disabled
                className="input-field w-full opacity-60 cursor-not-allowed"
              />
            </div>
          ) : schedulePdpSyncHintLoading ? (
            <div className="py-2 text-center text-text-secondary text-sm">
              {t('admin.parsing.loading')}
            </div>
          ) : (
            <>
              {schedulePdpSyncHint &&
                scheduleForm.parserCode === '999md' &&
                !schedulePdpSyncHint.plpLoginMatchesFileKey && (
                  <InfoBlock>{t('admin.parsing.registrySyncLoginMismatch')}</InfoBlock>
                )}
              <ParsingAssignedUserField
                value={scheduleForm.assignedUserId}
                onChange={(value) => setScheduleForm((s) => ({ ...s, assignedUserId: value }))}
                validation={scheduleAssignValidation}
              />
            </>
          ))}
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldFrequency')}</label>
          <Dropdown
            value={scheduleForm.frequencyPreset}
            onChange={(value) =>
              setScheduleForm((s) => ({
                ...s,
                frequencyPreset: value as typeof scheduleForm.frequencyPreset,
              }))
            }
            options={[
              { value: 'every_n_hours', label: t('admin.parsing.presetEveryNHours') },
              { value: 'every_n_days', label: t('admin.parsing.presetEveryNDays') },
              { value: 'daily', label: t('admin.parsing.presetDaily') },
              { value: 'weekly', label: t('admin.parsing.presetWeekly') },
              { value: 'custom', label: t('admin.parsing.presetCustom') },
            ]}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        {scheduleForm.frequencyPreset === 'every_n_hours' && (
          <div>
            <label className={modalFieldLabelClassName}>
              {t('admin.parsing.fieldEveryNHours')}
            </label>
            <input
              type="number"
              min={1}
              className={modalInputClassName}
              value={scheduleForm.everyNHours}
              onChange={(e) =>
                setScheduleForm((s) => ({ ...s, everyNHours: Number(e.target.value) }))
              }
            />
          </div>
        )}
        {scheduleForm.frequencyPreset === 'every_n_days' && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldEveryNDays')}</label>
            <input
              type="number"
              min={1}
              max={30}
              className={modalInputClassName}
              value={scheduleForm.everyNDays}
              onChange={(e) =>
                setScheduleForm((s) => ({ ...s, everyNDays: Number(e.target.value) }))
              }
            />
          </div>
        )}
        {scheduleForm.frequencyPreset === 'weekly' && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldWeekday')}</label>
            <Dropdown
              value={scheduleForm.presetWeekday}
              onChange={(value) => setScheduleForm((s) => ({ ...s, presetWeekday: value }))}
              options={scheduleWeekdayOptions}
              placeholder={t('admin.parsing.selectWeekday')}
              renderMenuInPortal
              className="w-full"
            />
          </div>
        )}
        {shouldShowSchedulePresetTimeField && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPresetTime')}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                <ClockIcon className="w-4 h-4" />
              </span>
              <input
                type="time"
                className={`${modalInputClassName} !pl-10 [&::-webkit-calendar-picker-indicator]:hidden`}
                value={scheduleForm.presetTime}
                disabled={!canEditSchedulePresetTime}
                onChange={(e) => setScheduleForm((s) => ({ ...s, presetTime: e.target.value }))}
              />
            </div>
          </div>
        )}
        {scheduleForm.frequencyPreset === 'custom' && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldCron')}</label>
            <input
              className={`${modalInputClassName} font-mono`}
              value={scheduleForm.cronExpression}
              onChange={(e) => setScheduleForm((s) => ({ ...s, cronExpression: e.target.value }))}
            />
          </div>
        )}
        {shouldShowScheduleTimezoneField && (
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldTimezone')}</label>
            <Dropdown
              value={scheduleForm.timezone}
              onChange={(value) => setScheduleForm((s) => ({ ...s, timezone: value }))}
              options={scheduleTimezoneOptions}
              disabled={!canEditScheduleTimezone}
              searchable
              renderMenuInPortal
              className="w-full"
            />
          </div>
        )}

        {scheduleForm.runType === 'plp' ? (
          <ParsingScheduleModalPlpConfig {...c} />
        ) : (
          <ParsingScheduleModalPdpConfig {...c} />
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0">
          <AdminActionButton
            variant="secondary"
            className="w-full shrink-0 sm:flex-1"
            disabled={scheduleCreating}
            onClick={closeScheduleModal}
          >
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton
            className="w-full shrink-0 sm:flex-1"
            disabled={scheduleSubmitDisabled}
            aria-busy={scheduleCreating}
            onClick={() => void submitSchedule()}
          >
            {editingSchedule
              ? t('admin.parsing.submitScheduleSave')
              : t('admin.parsing.submitSchedule')}
          </AdminActionButton>
        </div>
      </div>
    </Modal>
  );
}
