'use client';

import { Pagination, PlayIcon, RefreshIcon } from '@/ui';

import { AdminActionButton } from '../AdminButtons';
import { ParsingRunsTable } from '../ParsingTabTables';

import {
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tableHeaderClassName,
  tablePrimaryButtonClassName,
} from './parsing-tab-constants';
import { getPlpRunFileName, getRunStatusClassName } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabPdpPanel(c: ParsingTabControllerState) {
  const { t, catalog, lists, manualRuns } = c;
  const {
    pdpRuns,
    onPdpRunsListRefresh,
    pdpListRefreshCooldown,
    openRunActionsMenu,
    setOpenRunActionsMenu,
    setOpenScheduleActionsMenu,
    setOpenPlpFileActionsMenu,
  } = lists;
  const {
    catalogLoading,
    catalog: catalogItems,
    getParserLabel,
    getTranslatedParsingValue,
  } = catalog;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
        <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.pdpTitle')}</h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <AdminActionButton
            className="w-full sm:w-auto"
            onClick={() => manualRuns.openPdpModal()}
            disabled={catalogLoading || catalogItems.length === 0}
          >
            <PlayIcon className="w-5 h-5 shrink-0" aria-hidden />
            {t('admin.parsing.startPdp')}
          </AdminActionButton>
          <AdminActionButton
            className="w-full sm:w-auto"
            variant={pdpRuns.loading || pdpListRefreshCooldown ? 'secondary' : 'primary'}
            onClick={() => void onPdpRunsListRefresh()}
            disabled={pdpRuns.loading || pdpListRefreshCooldown}
            aria-busy={pdpRuns.loading}
          >
            <RefreshIcon className="w-5 h-5 shrink-0" aria-hidden />
            {t('admin.parsing.refresh')}
          </AdminActionButton>
        </div>
      </div>
      <ParsingRunsTable
        rows={pdpRuns.data}
        loading={pdpRuns.loading}
        runType="pdp"
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
      {(pdpRuns.meta?.totalPages ?? 0) > 1 && (
        <Pagination
          currentPage={pdpRuns.page}
          totalPages={pdpRuns.meta?.totalPages ?? 1}
          onPageChange={pdpRuns.setPage}
        />
      )}
    </div>
  );
}
