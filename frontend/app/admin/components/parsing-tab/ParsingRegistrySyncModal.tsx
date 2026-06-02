'use client';

import { Modal } from '@/components/modals/Modal';
import { toast } from '@/lib/toast';
import { InfoBlock } from '@/ui';

import { AdminActionButton } from '../AdminButtons';

import { ParsingAssignedUserField } from './ParsingAssignedUserField';
import { modalInputClassName, modalPrimaryButtonClassName } from './parsing-tab-constants';
import { getSearchMatchCount, isRunActive, renderHighlightedText } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingRegistrySyncModal(c: ParsingTabControllerState) {
  const { t, registrySync } = c;
  const {
    registrySyncModalOpen,
    closeRegistrySyncModal,
    registrySyncFile,
    registrySyncHintLoading,
    registrySyncHint,
    registrySyncAssignedUserId,
    setRegistrySyncAssignedUserId,
    registrySyncModalRun,
    registrySyncSearchQuery,
    setRegistrySyncSearchQuery,
    registrySyncReportJson,
    registrySyncLogLines,
    registrySyncAssignValidation,
    hasRegistrySyncLogContent,
    startRegistrySync,
    cancelRegistrySyncRun,
  } = registrySync;
  const copyModalText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('admin.parsing.copySuccess', { label }));
    } catch {
      toast.error(t('admin.parsing.copyError'));
    }
  };
  return (
    <Modal
      isOpen={registrySyncModalOpen}
      onClose={() => closeRegistrySyncModal()}
      title={
        registrySyncFile
          ? `${t('admin.parsing.registrySyncModalTitle')} — ${registrySyncFile.fileName}`
          : t('admin.parsing.registrySyncModalTitle')
      }
      size="large"
    >
      <div className="space-y-4">
        {registrySyncHintLoading ? (
          <div className="py-6 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
        ) : (
          <>
            <InfoBlock>
              {registrySyncFile?.parserCode === '999md'
                ? t('admin.parsing.registrySyncInfo999md')
                : t('admin.parsing.registrySyncInfoCipauto')}
            </InfoBlock>
            {registrySyncHint &&
              registrySyncFile?.parserCode === '999md' &&
              !registrySyncHint.plpLoginMatchesFileKey && (
                <InfoBlock>{t('admin.parsing.registrySyncLoginMismatch')}</InfoBlock>
              )}
            <ParsingAssignedUserField
              value={registrySyncAssignedUserId}
              onChange={(v) => setRegistrySyncAssignedUserId(v)}
              validation={registrySyncAssignValidation}
              labelKey="admin.parsing.registrySyncAssignedUserLabel"
              hintKey="admin.parsing.registrySyncAssignedUserHint"
              hintAriaKey="admin.parsing.fieldAssignedUserHintButton"
            />
            <div className="mb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {registrySyncModalRun && isRunActive(registrySyncModalRun.status) ? (
                    <AdminActionButton
                      variant="secondary"
                      className={modalPrimaryButtonClassName}
                      onClick={() => void cancelRegistrySyncRun()}
                    >
                      {t('admin.parsing.registrySyncCancelRun')}
                    </AdminActionButton>
                  ) : (
                    <AdminActionButton
                      className={modalPrimaryButtonClassName}
                      disabled={
                        !registrySyncFile ||
                        (registrySyncFile.parserCode === '999md' &&
                          registrySyncHint &&
                          !registrySyncHint.plpLoginMatchesFileKey) ||
                        registrySyncAssignValidation.status !== 'valid' ||
                        (registrySyncModalRun ? isRunActive(registrySyncModalRun.status) : false)
                      }
                      onClick={() => void startRegistrySync()}
                    >
                      {t('admin.parsing.registrySyncStart')}
                    </AdminActionButton>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end sm:flex-1">
                  <AdminActionButton
                    className={modalPrimaryButtonClassName}
                    onClick={() =>
                      void copyModalText(
                        [
                          hasRegistrySyncLogContent ? registrySyncLogLines.join('\n') : '',
                          registrySyncReportJson,
                        ]
                          .filter((s) => s.trim().length > 0)
                          .join('\n\n---\n\n'),
                        t('admin.parsing.registrySyncModalTitle'),
                      )
                    }
                  >
                    {t('admin.parsing.copy')}
                  </AdminActionButton>
                  <div className="w-full sm:w-80">
                    <input
                      type="text"
                      value={registrySyncSearchQuery}
                      onChange={(e) => setRegistrySyncSearchQuery(e.target.value)}
                      placeholder={t('admin.parsing.searchPlaceholder')}
                      className={modalInputClassName}
                    />
                  </div>
                </div>
              </div>
              <div className="sm:flex sm:justify-end">
                <p className="mt-1 text-xs text-text-secondary sm:text-right">
                  {t('admin.parsing.searchMatches', {
                    count: registrySyncSearchQuery.trim()
                      ? getSearchMatchCount(
                          [
                            hasRegistrySyncLogContent ? registrySyncLogLines.join('\n') : '',
                            registrySyncReportJson,
                          ]
                            .filter((s) => s.trim().length > 0)
                            .join('\n\n'),
                          registrySyncSearchQuery.trim(),
                        )
                      : '—',
                  })}
                </p>
              </div>
            </div>
            {registrySyncReportJson ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary-900">
                  {t('admin.parsing.registrySyncReportTitle')}
                </h3>
                <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-[24vh] overflow-y-auto bg-primary-500/5 p-3 rounded-lg border border-primary-500/15">
                  {renderHighlightedText(registrySyncReportJson, registrySyncSearchQuery.trim())}
                </pre>
              </div>
            ) : null}
            {hasRegistrySyncLogContent ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto bg-primary-500/5 p-3 rounded-lg border border-primary-500/15">
                {renderHighlightedText(
                  registrySyncLogLines.join('\n'),
                  registrySyncSearchQuery.trim(),
                )}
              </pre>
            ) : (
              <InfoBlock>{t('admin.parsing.registrySyncLogsEmpty')}</InfoBlock>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
