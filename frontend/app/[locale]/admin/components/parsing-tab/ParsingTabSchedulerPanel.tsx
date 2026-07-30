'use client';

import { Pagination } from '@/ui';

import { AdminActionButton } from '../AdminButtons';
import { ParsingSchedulesTable } from '../ParsingTabTables';

import {
  tableCenteredCellClassName,
  tableCenteredSecondaryCellClassName,
  tableHeaderClassName,
  tablePrimaryButtonClassName,
} from './parsing-tab-constants';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabSchedulerPanel(c: ParsingTabControllerState) {
  const { t, catalog, lists, schedules } = c;
  const {
    schedules: schedulesList,
    openScheduleActionsMenu,
    setOpenScheduleActionsMenu,
    setOpenRunActionsMenu,
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
        <h2 className="text-xl font-bold text-primary-900">{t('admin.parsing.schedulerTitle')}</h2>
        <AdminActionButton
          className="w-full sm:w-auto"
          onClick={schedules.openScheduleCreateModal}
          disabled={catalogLoading || !catalogItems.some((item) => item.schedulerEnabled)}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('common.add')}
        </AdminActionButton>
      </div>
      <ParsingSchedulesTable
        rows={schedulesList.data}
        loading={schedulesList.loading}
        t={t}
        tableHeaderClassName={tableHeaderClassName}
        tableCenteredCellClassName={tableCenteredCellClassName}
        tableCenteredSecondaryCellClassName={tableCenteredSecondaryCellClassName}
        tablePrimaryButtonClassName={tablePrimaryButtonClassName}
        getParserLabel={getParserLabel}
        getTranslatedParsingValue={getTranslatedParsingValue}
        openScheduleActionsMenuId={openScheduleActionsMenu?.id ?? null}
        scheduleRunNowPendingId={schedules.scheduleRunNowPendingId}
        onScheduleActionsClose={() => setOpenScheduleActionsMenu(null)}
        onScheduleActionsClick={({ schedule, top, left }) => {
          setOpenRunActionsMenu(null);
          setOpenPlpFileActionsMenu(null);
          setOpenScheduleActionsMenu({ id: schedule.id, top, left });
        }}
      />
      {(schedulesList.meta?.totalPages ?? 0) > 1 && (
        <Pagination
          currentPage={schedulesList.page}
          totalPages={schedulesList.meta?.totalPages ?? 1}
          onPageChange={schedulesList.setPage}
        />
      )}
    </div>
  );
}
