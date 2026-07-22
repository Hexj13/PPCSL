'use client';

import { Dropdown } from '@/components/common/Dropdown';

import {
  cipautoParserCode,
  modalFieldLabelClassName,
  modalInputClassName,
} from './parsing-tab-constants';
import type { PlpScanMode } from './parsing-tab-types';
import type { ParsingTabControllerState } from './useParsingTabController';
export function ParsingScheduleModalPlpConfig(c: ParsingTabControllerState) {
  const { t, forms } = c;
  const { scheduleForm, setScheduleForm, schedulePlpScanInputMode, schedulePlpScanModeOptions } =
    forms;
  return (
    <div className="space-y-3 border-t border-primary-500/15 pt-3">
      <p className="font-semibold text-primary-900">{t('admin.parsing.schedulePlpConfig')}</p>
      {schedulePlpScanInputMode === 'profile_login' ? (
        <>
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldLogin')}</label>
            <input
              type="text"
              className={modalInputClassName}
              value={scheduleForm.plpLogin}
              onChange={(e) => setScheduleForm((s) => ({ ...s, plpLogin: e.target.value }))}
            />
          </div>
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPageSize')}</label>
            <input
              type="number"
              min={1}
              className={modalInputClassName}
              value={scheduleForm.plpPageSize}
              onChange={(e) =>
                setScheduleForm((s) => ({ ...s, plpPageSize: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldMaxItems')}</label>
            <input
              type="number"
              min={1}
              className={modalInputClassName}
              value={scheduleForm.plpMaxItems}
              onChange={(e) => setScheduleForm((s) => ({ ...s, plpMaxItems: e.target.value }))}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldScanMode')}</label>
            <Dropdown
              value={scheduleForm.plpScanMode}
              onChange={(value) =>
                setScheduleForm((s) => ({
                  ...s,
                  plpScanMode: value as PlpScanMode,
                }))
              }
              options={schedulePlpScanModeOptions}
              renderMenuInPortal
              className="w-full"
            />
          </div>
          {scheduleForm.plpScanMode === 'first_n' ? (
            <div>
              <label className={modalFieldLabelClassName}>
                {t('admin.parsing.fieldPagesFirst')}
              </label>
              <input
                type="number"
                min={1}
                className={modalInputClassName}
                value={scheduleForm.plpPagesFirst}
                onChange={(e) =>
                  setScheduleForm((s) => ({ ...s, plpPagesFirst: Number(e.target.value) }))
                }
              />
            </div>
          ) : scheduleForm.plpScanMode === 'range' &&
            scheduleForm.parserCode !== cipautoParserCode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={modalFieldLabelClassName}>
                  {t('admin.parsing.fieldPageFrom')}
                </label>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={scheduleForm.plpPageFrom}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, plpPageFrom: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className={modalFieldLabelClassName}>{t('admin.parsing.fieldPageTo')}</label>
                <input
                  type="number"
                  min={1}
                  className={modalInputClassName}
                  value={scheduleForm.plpPageTo}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, plpPageTo: Number(e.target.value) }))
                  }
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
          value={scheduleForm.plpDelayMs}
          onChange={(e) => setScheduleForm((s) => ({ ...s, plpDelayMs: Number(e.target.value) }))}
        />
      </div>
    </div>
  );
}
