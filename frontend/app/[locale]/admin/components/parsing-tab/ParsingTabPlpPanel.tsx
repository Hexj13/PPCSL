'use client';

import { Pagination, PlayIcon, RefreshIcon, Spinner } from '@/ui';

import { AdminActionButton } from '../AdminButtons';
import { ParsingPlpFilesTable, ParsingRunsTable } from '../ParsingTabTables';

import {
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tableHeaderClassName,
  tablePrimaryButtonClassName,
} from './parsing-tab-constants';
import { getPlpRunFileName, getRunStatusClassName } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabPlpPanel(c: ParsingTabControllerState) {
  const { t, catalog, lists, manualRuns } = c;
  const {
    plpRuns,
    plpFilesList,
    onPlpRunsListRefresh,
    onPlpFilesRefresh,
    plpFilesRefreshing,
    plpListRefreshCooldown,
    openPlpFileActionsMenu,
    setOpenPlpFileActionsMenu,
    openRunActionsMenu,
    setOpenRunActionsMenu,
    setOpenScheduleActionsMenu,
  } = lists;
  const {
    catalogLoading,
    catalog: catalogItems,
    getParserLabel,
    getTranslatedParsingValue,
  } = catalog;

  const plpFilesBusy = plpFilesRefreshing || plpFilesList.loading;

  return (
    <div>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
          <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.plpFilesTitle')}</h2>
          <AdminActionButton
            className="w-full sm:w-auto"
            variant={plpFilesBusy ? 'secondary' : 'primary'}
            onClick={() => void onPlpFilesRefresh()}
            disabled={plpFilesBusy}
            aria-busy={plpFilesBusy}
          >
            {plpFilesBusy ? (
              <Spinner size="sm" inline />
            ) : (
              <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
            )}
            {t('admin.parsing.refresh')}
          </AdminActionButton>
        </div>
        <div
          className={plpFilesBusy && plpFilesList.data.length > 0 ? 'opacity-60' : undefined}
          aria-busy={plpFilesBusy}
        >
          <ParsingPlpFilesTable
            rows={plpFilesList.data}
            loading={plpFilesList.loading && plpFilesList.data.length === 0}
            t={t}
            tableHeaderClassName={tableHeaderClassName}
            tableCenteredCellClassName={tableCenteredCellClassName}
            tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
            tablePrimaryButtonClassName={tablePrimaryButtonClassName}
            openPlpFileActionsMenuKey={
              openPlpFileActionsMenu
                ? `${openPlpFileActionsMenu.file.parserCode}:${openPlpFileActionsMenu.file.fileKey}`
                : null
            }
            onPlpFileActionsClose={() => setOpenPlpFileActionsMenu(null)}
            onPlpFileActionsClick={({ file, top, left }) => {
              setOpenRunActionsMenu(null);
              setOpenScheduleActionsMenu(null);
              setOpenPlpFileActionsMenu({ file, top, left });
            }}
          />
        </div>
        {(plpFilesList.meta?.totalPages ?? 0) > 1 && (
          <Pagination
            currentPage={plpFilesList.page}
            totalPages={plpFilesList.meta?.totalPages ?? 1}
            onPageChange={plpFilesList.setPage}
          />
        )}
      </div>
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
          <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.plpTitle')}</h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <AdminActionButton
              className="w-full sm:w-auto"
              onClick={() => manualRuns.openPlpModal()}
              disabled={catalogLoading || catalogItems.length === 0}
            >
              <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('admin.parsing.startPlp')}
            </AdminActionButton>
            <AdminActionButton
              className="w-full sm:w-auto"
              variant={plpRuns.loading || plpListRefreshCooldown ? 'secondary' : 'primary'}
              onClick={() => void onPlpRunsListRefresh()}
              disabled={plpRuns.loading || plpListRefreshCooldown}
              aria-busy={plpRuns.loading}
            >
              <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('admin.parsing.refresh')}
            </AdminActionButton>
          </div>
        </div>
        <ParsingRunsTable
          rows={plpRuns.data}
          loading={plpRuns.loading}
          runType="plp"
          t={t}
          tableHeaderClassName={tableHeaderClassName}
          tableCenteredCellClassName={tableCenteredCellClassName}
          tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
          tablePrimaryButtonClassName={tablePrimaryButtonClassName}
          getParserLabel={getParserLabel}
          getTranslatedParsingValue={getTranslatedParsingValue}
          getPlpRunFileName={getPlpRunFileName}
          getRunStatusClassName={getRunStatusClassName}
          openRunActionsMenuRunId={openRunActionsMenu?.run.id ?? null}
          onRunActionsClose={() => setOpenRunActionsMenu(null)}
          onRunActionsClick={({ run, top, left, canOpenFile }) => {
            setOpenScheduleActionsMenu(null);
            setOpenPlpFileActionsMenu(null);
            setOpenRunActionsMenu({ run, top, left, canOpenFile });
          }}
        />
        {(plpRuns.meta?.totalPages ?? 0) > 1 && (
          <Pagination
            currentPage={plpRuns.page}
            totalPages={plpRuns.meta?.totalPages ?? 1}
            onPageChange={plpRuns.setPage}
          />
        )}
      </div>
    </div>
  );
}
