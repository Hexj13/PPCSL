'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { Checkbox } from '@/ui';

import { ParsingCheckboxLabelWithHint } from './ParsingCheckboxLabelWithHint';
import { modalFieldLabelClassName, modalInputClassName } from './parsing-tab-constants';
import type { ParsingTabControllerState } from './useParsingTabController';
export function ParsingScheduleModalPdpConfig(c: ParsingTabControllerState) {
  const { t, catalog, forms } = c;
  const { cityOptions } = catalog;
  const { scheduleForm, setScheduleForm, registrationTypeOptions } = forms;
  return (
    <div className="space-y-3 border-t border-primary-500/15 pt-3">
      <p className="font-semibold text-primary-900">{t('admin.parsing.schedulePdpConfig')}</p>
      <div>
        <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldListingStatus')}</span>
        <Dropdown
          value={scheduleForm.pdpListingStatus}
          onChange={(value) =>
            setScheduleForm((s) => ({
              ...s,
              pdpListingStatus: value as 'active' | 'paused',
            }))
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
        <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldLimitOptional')}</span>
        <input
          type="number"
          min={1}
          className={modalInputClassName}
          value={scheduleForm.pdpLimit}
          onChange={(e) => setScheduleForm((s) => ({ ...s, pdpLimit: e.target.value }))}
        />
      </div>
      <div>
        <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldRegistrationType')}</span>
        <Dropdown
          value={scheduleForm.pdpRegistrationType}
          onChange={(value) => setScheduleForm((s) => ({ ...s, pdpRegistrationType: value }))}
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
          value={scheduleForm.pdpDefaultHp}
          onChange={(e) => setScheduleForm((s) => ({ ...s, pdpDefaultHp: Number(e.target.value) }))}
        />
      </div>
      <div>
        <span className={modalFieldLabelClassName}>{t('admin.parsing.fieldCity')}</span>
        <Dropdown
          value={scheduleForm.pdpCity}
          onChange={(value) => setScheduleForm((s) => ({ ...s, pdpCity: value }))}
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
          value={scheduleForm.pdpDelayMs}
          onChange={(e) => setScheduleForm((s) => ({ ...s, pdpDelayMs: Number(e.target.value) }))}
        />
      </div>
      <div className="space-y-3">
        <Checkbox
          checked={scheduleForm.pdpRemoveClosed}
          onChange={(checked) =>
            setScheduleForm((s) => ({
              ...s,
              pdpRemoveClosed: checked,
              pdpForceClose: checked ? s.pdpForceClose : false,
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
          checked={scheduleForm.pdpForceClose}
          onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpForceClose: checked }))}
          disabled={!scheduleForm.pdpRemoveClosed}
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
          checked={scheduleForm.pdpOnlyFailed}
          onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpOnlyFailed: checked }))}
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
          checked={scheduleForm.pdpUpdateExisting}
          onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpUpdateExisting: checked }))}
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
          checked={scheduleForm.pdpCheckUserDuplicatesBeforeCreate}
          onChange={(checked) =>
            setScheduleForm((s) => ({ ...s, pdpCheckUserDuplicatesBeforeCreate: checked }))
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
          checked={scheduleForm.pdpAutoCreateBrands}
          onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpAutoCreateBrands: checked }))}
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
          checked={scheduleForm.pdpAutoCreateModels}
          onChange={(checked) => setScheduleForm((s) => ({ ...s, pdpAutoCreateModels: checked }))}
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
    </div>
  );
}
