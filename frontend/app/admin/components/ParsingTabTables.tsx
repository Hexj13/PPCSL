'use client';

import type { MouseEventHandler } from 'react';

import type { ParserRun, PlpFileInfo } from '@/lib/api/admin-parsing';
import { formatAdminTableDateTime } from '@/lib/utils';

import { AdminActionButton } from './AdminButtons';

type InnerTab = 'plp' | 'pdp' | 'scheduler';

interface ParsingRunsTableProps {
  rows: ParserRun[];
  loading: boolean;
  runType: InnerTab;
  t: (_key: string) => string;
  tableHeaderClassName: string;
  tableCenteredCellClassName: string;
  tableCenteredSecondaryCellClassName: string;
  tablePrimaryButtonClassName: string;
  getParserLabel: (_parserCode: string) => string;
  getTranslatedParsingValue: (_group: string, _value: string | null | undefined) => string;
  getPlpRunFileName: (_run: ParserRun) => string;
  getRunStatusClassName: (_status: string) => string;
  openRunActionsMenuRunId: string | null;
  onRunActionsClick: (_args: {
    run: ParserRun;
    top: number;
    left: number;
    canOpenFile: boolean;
  }) => void;
  onRunActionsClose: () => void;
}

interface ParsingPlpFilesTableProps {
  rows: PlpFileInfo[];
  loading: boolean;
  t: (_key: string) => string;
  tableHeaderClassName: string;
  tableCenteredCellClassName: string;
  tableCenteredSecondaryCellClassName: string;
  tablePrimaryButtonClassName: string;
  openPlpFileActionsMenuKey: string | null;
  onPlpFileActionsClick: (_args: { file: PlpFileInfo; top: number; left: number }) => void;
  onPlpFileActionsClose: () => void;
}

export function ParsingRunsTable({
  rows,
  loading,
  runType,
  t,
  tableHeaderClassName,
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tablePrimaryButtonClassName,
  getParserLabel,
  getTranslatedParsingValue,
  getPlpRunFileName,
  getRunStatusClassName,
  openRunActionsMenuRunId,
  onRunActionsClick,
  onRunActionsClose,
}: ParsingRunsTableProps) {
  const latestPlpRunIdsByParser = new Set<string>();
  const seenPlpParsers = new Set<string>();

  for (const row of rows) {
    if (row.run_type !== 'plp' || seenPlpParsers.has(row.parser_code)) {
      continue;
    }
    seenPlpParsers.add(row.parser_code);
    latestPlpRunIdsByParser.add(row.id);
  }

  const makeRunActionsClickHandler = (run: ParserRun): MouseEventHandler<HTMLButtonElement> => {
    return (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (openRunActionsMenuRunId === run.id) {
        onRunActionsClose();
        return;
      }
      onRunActionsClick({
        run,
        top: rect.bottom + 6,
        left: rect.right,
        canOpenFile: runType === 'plp' && latestPlpRunIdsByParser.has(run.id),
      });
    };
  };

  return (
    <div className="space-y-4">
      {loading && rows.length === 0 ? (
        <div className="py-8 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-text-secondary">{t('admin.parsing.noRuns')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
            <thead>
              <tr className="border-b border-primary-700/30">
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colParser')}
                </th>
                {runType === 'plp' && (
                  <th className={`text-center ${tableHeaderClassName}`}>
                    {t('admin.parsing.colFileName')}
                  </th>
                )}
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colTrigger')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colCreated')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colFinished')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colStatus')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr key={run.id} className="border-b border-primary-700/10">
                  <td className={tableCenteredCellClassName}>{getParserLabel(run.parser_code)}</td>
                  {runType === 'plp' && (
                    <td className={tableCenteredSecondaryCellClassName}>
                      {getPlpRunFileName(run)}
                    </td>
                  )}
                  <td className={tableCenteredSecondaryCellClassName}>
                    {getTranslatedParsingValue('trigger', run.trigger_mode)}
                  </td>
                  <td className={`${tableCenteredSecondaryCellClassName} whitespace-nowrap`}>
                    {formatAdminTableDateTime(run.created_at)}
                  </td>
                  <td className={`${tableCenteredSecondaryCellClassName} whitespace-nowrap`}>
                    {formatAdminTableDateTime(run.finished_at)}
                  </td>
                  <td
                    className={`${tableCenteredCellClassName} font-semibold ${getRunStatusClassName(run.status)}`}
                  >
                    {getTranslatedParsingValue('status', run.status)}
                  </td>
                  <td className={`${tableCenteredCellClassName} whitespace-nowrap`}>
                    <div className="relative flex items-center justify-center">
                      <AdminActionButton
                        variant="secondary"
                        data-admin-actions-trigger
                        aria-haspopup="menu"
                        aria-expanded={openRunActionsMenuRunId === run.id}
                        aria-label={t('admin.parsing.colActions')}
                        className={tablePrimaryButtonClassName}
                        onClick={makeRunActionsClickHandler(run)}
                      >
                        <span>{t('admin.parsing.colActions')}</span>
                      </AdminActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ParsingPlpFilesTable({
  rows,
  loading,
  t,
  tableHeaderClassName,
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tablePrimaryButtonClassName,
  openPlpFileActionsMenuKey,
  onPlpFileActionsClick,
  onPlpFileActionsClose,
}: ParsingPlpFilesTableProps) {
  const makePlpFileActionsClickHandler = (
    file: PlpFileInfo,
  ): MouseEventHandler<HTMLButtonElement> => {
    return (event) => {
      const key = `${file.parserCode}:${file.fileKey}`;
      if (openPlpFileActionsMenuKey === key) {
        onPlpFileActionsClose();
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      onPlpFileActionsClick({
        file,
        top: rect.bottom + 6,
        left: rect.right,
      });
    };
  };

  return (
    <div className="space-y-4">
      {loading && rows.length === 0 ? (
        <div className="py-8 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-text-secondary">
          {t('admin.parsing.plpFilesEmpty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
            <thead>
              <tr className="border-b border-primary-700/30">
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colParser')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colFileName')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colLastUpdated')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colItemsCount')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colErrorsCount')}
                </th>
                <th className={`text-center ${tableHeaderClassName}`}>
                  {t('admin.parsing.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((file) => {
                const totalErrors = file.errorItemsCount + file.missingCandidatesCount;
                return (
                  <tr
                    key={`${file.parserCode}:${file.fileKey}`}
                    className="border-b border-primary-700/10"
                  >
                    <td className={tableCenteredCellClassName}>{file.parserLabel}</td>
                    <td className={`${tableCenteredSecondaryCellClassName} max-w-[18rem]`}>
                      <div className="truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                    </td>
                    <td className={`${tableCenteredSecondaryCellClassName} whitespace-nowrap`}>
                      {formatAdminTableDateTime(file.lastUpdatedAt)}
                    </td>
                    <td className={tableCenteredCellClassName}>{file.itemsCount}</td>
                    <td className={tableCenteredCellClassName}>{totalErrors}</td>
                    <td className={`${tableCenteredCellClassName} whitespace-nowrap`}>
                      <div className="relative flex items-center justify-center">
                        <AdminActionButton
                          variant="secondary"
                          data-admin-actions-trigger
                          aria-haspopup="menu"
                          aria-expanded={
                            openPlpFileActionsMenuKey === `${file.parserCode}:${file.fileKey}`
                          }
                          aria-label={t('admin.parsing.colActions')}
                          className={tablePrimaryButtonClassName}
                          onClick={makePlpFileActionsClickHandler(file)}
                        >
                          <span>{t('admin.parsing.colActions')}</span>
                        </AdminActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
