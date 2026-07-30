'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { Checkbox, PlayIcon, InfoBlock, Spinner } from '@/ui';

import { AdminActionButton } from '../AdminButtons';

import { ParsingAssignedUserField } from './ParsingAssignedUserField';
import { ParsingCheckboxLabelWithHint } from './ParsingCheckboxLabelWithHint';
import { modalFieldLabelClassName, modalInputClassName } from './parsing-tab-constants';
import { getDefaultPdpCity, getParserPdpDefaults } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingPdpRunModal(c: ParsingTabControllerState) {
  const { t, catalog, forms, manualRuns } = c;
  const { catalogLoading, manualRunParserOptions, cities, cityOptions } = catalog;
  const {
    pdpForm,
    setPdpForm,
    pdpPlpFileOptions,
    pdpPlpFileSelectDisabled,
    selectedPdpParserLabel,
    registrationTypeOptions,
    pdpSyncHintLoading,
    pdpSyncHint,
    pdpAssignValidation,
  } = forms;
  const { pdpModalOpen, closePdpModal, submitPdp, pdpSubmitDisabled, pdpSubmitting } = manualRuns;
  return (
    <Modal
      isOpen={pdpModalOpen}
      onClose={() => closePdpModal()}
      title={t('admin.parsing.pdpModalTitle')}
      size="large"
    >
      <div className="space-y-4">
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
          {manualRunParserOptions.length <= 1 ? (
            <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
              {selectedPdpParserLabel}
            </div>
          ) : (
            <Dropdown
              value={pdpForm.parserCode}
              onChange={(value) =>
                setPdpForm((s) => {
                  const pdpDefaults = getParserPdpDefaults(value);
                  return {
                    ...s,
                    parserCode: value,
                    plpFileKey: '',
                    listingStatus: pdpDefaults.listingStatus,
                    registrationType: pdpDefaults.registrationType,
                    defaultHp: pdpDefaults.defaultHp,
                    city: getDefaultPdpCity(value, cities),
                    delayMs: pdpDefaults.delayMs,
                    resume: pdpDefaults.resume,
                    dryRun: pdpDefaults.dryRun,
                    removeClosed: pdpDefaults.removeClosed,
                    forceClose: false,
                    onlyFailed: pdpDefaults.onlyFailed,
                    updateExisting: pdpDefaults.updateExisting,
                    checkUserDuplicatesBeforeCreate: false,
                    autoCreateBrands: pdpDefaults.autoCreateBrands,
                    autoCreateModels: pdpDefaults.autoCreateModels,
                  };
                })
              }
              options={manualRunParserOptions}
              disabled={catalogLoading}
              renderMenuInPortal
              className="w-full"
            />
          )}
        </div>
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPlpFile')}</label>
          <Dropdown
            value={pdpForm.plpFileKey}
            onChange={(value) => setPdpForm((s) => ({ ...s, plpFileKey: value }))}
            options={
              pdpPlpFileOptions.length > 0
                ? pdpPlpFileOptions.map((item) => ({ value: item.key, label: item.fileName }))
                : [{ value: '', label: '—' }]
            }
            disabled={pdpPlpFileSelectDisabled}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        {pdpSyncHintLoading ? (
          <div className="py-2 text-center text-text-secondary text-sm">
            {t('admin.parsing.loading')}
          </div>
        ) : (
          <>
            {pdpSyncHint &&
              pdpForm.parserCode === '999md' &&
              !pdpSyncHint.plpLoginMatchesFileKey && (
                <InfoBlock>{t('admin.parsing.registrySyncLoginMismatch')}</InfoBlock>
              )}
            <ParsingAssignedUserField
              value={pdpForm.assignedUserId}
              onChange={(value) => setPdpForm((s) => ({ ...s, assignedUserId: value }))}
              validation={pdpAssignValidation}
            />
          </>
        )}
        <div>
          <label className={modalFieldLabelClassName}>
            {t('admin.parsing.fieldListingStatus')}
          </label>
          <Dropdown
            value={pdpForm.listingStatus}
            onChange={(value) =>
              setPdpForm((s) => ({ ...s, listingStatus: value as 'active' | 'paused' }))
            }
            options={[
              { value: 'active', label: t('admin.listingsTab.active') },
              { value: 'paused', label: t('admin.listingsTab.paused') },
            ]}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        <div>
          <label className={modalFieldLabelClassName}>
            {t('admin.parsing.fieldLimitOptional')}
          </label>
          <input
            type="number"
            min={1}
            className={modalInputClassName}
            value={pdpForm.limit}
            onChange={(e) => setPdpForm((s) => ({ ...s, limit: e.target.value }))}
          />
        </div>
        <div>
          <span className={modalFieldLabelClassName}>
            {t('admin.parsing.fieldRegistrationType')}
          </span>
          <Dropdown
            value={pdpForm.registrationType}
            onChange={(value) => setPdpForm((s) => ({ ...s, registrationType: value }))}
            options={registrationTypeOptions}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        <div>
          <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldDefaultHp')}</span>
          <input
            type="number"
            min={1}
            className={modalInputClassName}
            value={pdpForm.defaultHp}
            onChange={(e) => setPdpForm((s) => ({ ...s, defaultHp: Number(e.target.value) }))}
          />
        </div>
        <div>
          <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldCity')}</span>
          <Dropdown
            value={pdpForm.city}
            onChange={(value) => setPdpForm((s) => ({ ...s, city: value }))}
            options={cityOptions}
            renderMenuInPortal
            className="w-full"
          />
        </div>
        <div>
          <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldDelayMs')}</span>
          <input
            type="number"
            min={0}
            className={modalInputClassName}
            value={pdpForm.delayMs}
            onChange={(e) => setPdpForm((s) => ({ ...s, delayMs: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-3">
          <Checkbox
            checked={pdpForm.resume}
            onChange={(checked) => setPdpForm((s) => ({ ...s, resume: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldResume"
                hintKey="admin.parsing.fieldResumeHint"
                hintAriaKey="admin.parsing.fieldResumeHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.dryRun}
            onChange={(checked) => setPdpForm((s) => ({ ...s, dryRun: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldDryRun"
                hintKey="admin.parsing.fieldDryRunHint"
                hintAriaKey="admin.parsing.fieldDryRunHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.removeClosed}
            onChange={(checked) =>
              setPdpForm((s) => ({
                ...s,
                removeClosed: checked,
                forceClose: checked ? s.forceClose : false,
              }))
            }
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldRemoveClosed"
                hintKey="admin.parsing.fieldRemoveClosedHint"
                hintAriaKey="admin.parsing.fieldRemoveClosedHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.forceClose}
            onChange={(checked) => setPdpForm((s) => ({ ...s, forceClose: checked }))}
            disabled={!pdpForm.removeClosed}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldForceClose"
                hintKey="admin.parsing.fieldForceCloseHint"
                hintAriaKey="admin.parsing.fieldForceCloseHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.onlyFailed}
            onChange={(checked) => setPdpForm((s) => ({ ...s, onlyFailed: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldOnlyFailed"
                hintKey="admin.parsing.fieldOnlyFailedHint"
                hintAriaKey="admin.parsing.fieldOnlyFailedHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.updateExisting}
            onChange={(checked) => setPdpForm((s) => ({ ...s, updateExisting: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldUpdateExisting"
                hintKey="admin.parsing.fieldUpdateExistingHint"
                hintAriaKey="admin.parsing.fieldUpdateExistingHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.checkUserDuplicatesBeforeCreate}
            onChange={(checked) =>
              setPdpForm((s) => ({ ...s, checkUserDuplicatesBeforeCreate: checked }))
            }
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldCheckUserDuplicatesBeforeCreate"
                hintKey="admin.parsing.fieldCheckUserDuplicatesBeforeCreateHint"
                hintAriaKey="admin.parsing.fieldCheckUserDuplicatesBeforeCreateHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.autoCreateBrands}
            onChange={(checked) => setPdpForm((s) => ({ ...s, autoCreateBrands: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.pdp.autoCreateBrands"
                hintKey="admin.parsing.pdp.autoCreateBrandsHint"
                hintAriaKey="admin.parsing.pdp.autoCreateBrandsHintButton"
              />
            }
            size="sm"
          />
          <Checkbox
            checked={pdpForm.autoCreateModels}
            onChange={(checked) => setPdpForm((s) => ({ ...s, autoCreateModels: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.pdp.autoCreateModels"
                hintKey="admin.parsing.pdp.autoCreateModelsHint"
                hintAriaKey="admin.parsing.pdp.autoCreateModelsHintButton"
              />
            }
            size="sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0">
          <AdminActionButton
            variant="secondary"
            className="w-full shrink-0 sm:flex-1"
            onClick={() => closePdpModal()}
          >
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton
            className="w-full shrink-0 sm:flex-1"
            disabled={pdpSubmitDisabled}
            aria-busy={pdpSubmitting}
            onClick={() => void submitPdp()}
          >
            {pdpSubmitting ? (
              <Spinner size="sm" inline />
            ) : (
              <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
            )}
            {t('admin.parsing.submitRun')}
          </AdminActionButton>
        </div>
      </div>
    </Modal>
  );
}
