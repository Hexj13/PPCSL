'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { Checkbox, PlayIcon, Spinner } from '@/ui';

import { AdminActionButton } from '../AdminButtons';

import { ParsingCheckboxLabelWithHint } from './ParsingCheckboxLabelWithHint';
import {
  cipautoParserCode,
  modalFieldLabelClassName,
  modalInputClassName,
} from './parsing-tab-constants';
import type { PlpScanMode } from './parsing-tab-types';
import { getDefaultPlpScanMode } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingPlpRunModal(c: ParsingTabControllerState) {
  const { t, catalog, forms, manualRuns } = c;
  const { catalogLoading, manualRunParserOptions } = catalog;
  const { plpForm, setPlpForm, plpScanInputMode, plpScanModeOptions, selectedPlpParserLabel } =
    forms;
  const { plpModalOpen, closePlpModal, submitPlp, plpSubmitDisabled, plpSubmitting } = manualRuns;
  return (
    <Modal
      isOpen={plpModalOpen}
      onClose={() => closePlpModal()}
      title={t('admin.parsing.plpModalTitle')}
      size="large"
    >
      <div className="space-y-4">
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldParser')}</label>
          {manualRunParserOptions.length <= 1 ? (
            <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
              {selectedPlpParserLabel}
            </div>
          ) : (
            <Dropdown
              value={plpForm.parserCode}
              onChange={(value) =>
                setPlpForm((s) => ({
                  ...s,
                  parserCode: value,
                  scanMode: getDefaultPlpScanMode(value),
                  pagesFirst: 1,
                  pageFrom: 1,
                  pageTo: 1,
                  login: '',
                  pageSize: 50,
                  maxItems: '',
                }))
              }
              options={manualRunParserOptions}
              disabled={catalogLoading}
              renderMenuInPortal
              className="w-full"
            />
          )}
        </div>
        {plpScanInputMode === 'profile_login' ? (
          <>
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldLogin')}</label>
              <input
                type="text"
                className={modalInputClassName}
                value={plpForm.login}
                onChange={(e) => setPlpForm((s) => ({ ...s, login: e.target.value }))}
              />
            </div>
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPageSize')}</label>
              <input
                type="number"
                min={1}
                className={modalInputClassName}
                value={plpForm.pageSize}
                onChange={(e) => setPlpForm((s) => ({ ...s, pageSize: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldMaxItems')}</label>
              <input
                type="number"
                min={1}
                className={modalInputClassName}
                value={plpForm.maxItems}
                onChange={(e) => setPlpForm((s) => ({ ...s, maxItems: e.target.value }))}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldScanMode')}</label>
              <Dropdown
                value={plpForm.scanMode}
                onChange={(value) => setPlpForm((s) => ({ ...s, scanMode: value as PlpScanMode }))}
                options={plpScanModeOptions}
                renderMenuInPortal
                className="w-full"
              />
            </div>
            {plpForm.scanMode === 'first_n' ? (
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldPagesFirst')}
                </label>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={plpForm.pagesFirst}
                  onChange={(e) =>
                    setPlpForm((s) => ({ ...s, pagesFirst: Number(e.target.value) }))
                  }
                />
              </div>
            ) : plpForm.scanMode === 'range' && plpForm.parserCode !== cipautoParserCode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={modalFieldLabelClassName}>
                    {t('admin.parsing.fieldPageFrom')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={modalInputClassName}
                    value={plpForm.pageFrom}
                    onChange={(e) =>
                      setPlpForm((s) => ({ ...s, pageFrom: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className={modalFieldLabelClassName}>
                    {t('admin.parsing.fieldPageTo')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={modalInputClassName}
                    value={plpForm.pageTo}
                    onChange={(e) => setPlpForm((s) => ({ ...s, pageTo: Number(e.target.value) }))}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
        <div>
          <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldDelayMs')}</label>
          <input
            type="number"
            min={0}
            className={modalInputClassName}
            value={plpForm.delayMs}
            onChange={(e) => setPlpForm((s) => ({ ...s, delayMs: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-3">
          <Checkbox
            checked={plpForm.dryRun}
            onChange={(checked) => setPlpForm((s) => ({ ...s, dryRun: checked }))}
            label={
              <ParsingCheckboxLabelWithHint
                labelKey="admin.parsing.fieldDryRun"
                hintKey="admin.parsing.fieldDryRunHint"
                hintAriaKey="admin.parsing.fieldDryRunHintButton"
              />
            }
            size="sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0">
          <AdminActionButton
            variant="secondary"
            className="w-full shrink-0 sm:flex-1"
            onClick={() => closePlpModal()}
          >
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton
            className="w-full shrink-0 sm:flex-1"
            disabled={plpSubmitDisabled}
            aria-busy={plpSubmitting}
            onClick={() => void submitPlp()}
          >
            {plpSubmitting ? (
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
