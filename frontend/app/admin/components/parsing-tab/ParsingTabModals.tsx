'use client';

import { AdminActionsMenuPortal, AdminConfirmModal } from '../AdminTableShared';

import { ParsingPdpRunModal } from './ParsingPdpRunModal';
import { ParsingPlpFileContentModal } from './ParsingPlpFileContentModal';
import { ParsingPlpRunModal } from './ParsingPlpRunModal';
import { ParsingRegistrySyncModal } from './ParsingRegistrySyncModal';
import { ParsingRunLogsModal } from './ParsingRunLogsModal';
import { ParsingRunReportModal } from './ParsingRunReportModal';
import { ParsingScheduleModal } from './ParsingScheduleModal';
import { isRunActive } from './parsing-tab-utils';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabModals(c: ParsingTabControllerState) {
  const {
    t,
    catalog,
    lists,
    runModals,
    registrySync,
    schedules,
    confirmCancel,
    confirmDeletePlpFile,
    confirmDeleteSchedule,
  } = c;
  const {
    cancelRun,
    setCancelRun,
    deletePlpFileTarget,
    setDeletePlpFileTarget,
    deleteSchedule,
    setDeleteSchedule,
    openPlpFileActionsMenu,
    setOpenPlpFileActionsMenu,
    openRunActionsMenu,
    setOpenRunActionsMenu,
    openScheduleActionsMenu,
    setOpenScheduleActionsMenu,
    scheduleActionsTarget,
  } = lists;
  return (
    <>
      <ParsingPlpRunModal {...c} />
      <ParsingPdpRunModal {...c} />
      <ParsingScheduleModal {...c} />
      <ParsingRegistrySyncModal {...c} />
      <ParsingRunLogsModal {...c} />
      <ParsingRunReportModal {...c} />
      <ParsingPlpFileContentModal {...c} />
      <AdminConfirmModal
        isOpen={Boolean(cancelRun)}
        onClose={() => setCancelRun(null)}
        onConfirm={() => void confirmCancel()}
        title={t('admin.parsing.cancelTitle')}
        message={t('admin.parsing.cancelBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.parsing.cancelConfirm')}
      />

      <AdminConfirmModal
        isOpen={Boolean(deletePlpFileTarget)}
        onClose={() => setDeletePlpFileTarget(null)}
        onConfirm={() => void confirmDeletePlpFile()}
        title={t('admin.parsing.plpFileDeleteTitle')}
        message={t('admin.parsing.plpFileDeleteBody', {
          fileName: deletePlpFileTarget?.fileName ?? '',
        })}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('admin.parsing.plpFileDeleteConfirm')}
      />

      <AdminConfirmModal
        isOpen={Boolean(deleteSchedule)}
        onClose={() => setDeleteSchedule(null)}
        onConfirm={() => void confirmDeleteSchedule(deleteSchedule)}
        title={t('admin.parsing.deleteScheduleTitle')}
        message={t('admin.parsing.deleteScheduleBody')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openPlpFileActionsMenu)}
        top={openPlpFileActionsMenu?.top ?? 0}
        left={openPlpFileActionsMenu?.left ?? 0}
        menuDataAttr="data-plp-file-actions-menu"
        items={
          openPlpFileActionsMenu
            ? [
                {
                  id: 'show',
                  label: t('admin.parsing.plpFileShow'),
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    void runModals.openPlpFileFromTable(selectedFile);
                  },
                },
                {
                  id: 'download',
                  label: t('admin.parsing.plpFileDownload'),
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    void registrySync.downloadPlpFile(selectedFile);
                  },
                },
                ...(catalog.catalog.some(
                  (c) => c.code === openPlpFileActionsMenu.file.parserCode && c.registrySyncEnabled,
                )
                  ? [
                      {
                        id: 'registry-sync',
                        label: t('admin.parsing.plpFileRegistrySync'),
                        onSelect: () => {
                          const selectedFile = openPlpFileActionsMenu.file;
                          setOpenPlpFileActionsMenu(null);
                          void registrySync.openRegistrySyncModal(selectedFile);
                        },
                      },
                    ]
                  : []),
                {
                  id: 'delete',
                  label: t('admin.parsing.plpFileDelete'),
                  danger: true,
                  withTopDivider: true,
                  onSelect: () => {
                    const selectedFile = openPlpFileActionsMenu.file;
                    setOpenPlpFileActionsMenu(null);
                    setDeletePlpFileTarget(selectedFile);
                  },
                },
              ]
            : []
        }
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openScheduleActionsMenu && scheduleActionsTarget)}
        top={openScheduleActionsMenu?.top ?? 0}
        left={openScheduleActionsMenu?.left ?? 0}
        menuDataAttr="data-schedule-actions-menu"
        items={
          scheduleActionsTarget
            ? [
                {
                  id: 'run-now',
                  label: t('admin.parsing.runNow'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    void schedules.runScheduleNow(scheduleActionsTarget);
                  },
                },
                {
                  id: 'edit',
                  label: t('common.edit'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    schedules.openScheduleEditModal(scheduleActionsTarget);
                  },
                },
                {
                  id: 'toggle-status',
                  label:
                    scheduleActionsTarget.status === 'active'
                      ? t('admin.parsing.deactivate')
                      : t('admin.parsing.activate'),
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    void schedules.toggleScheduleStatus(scheduleActionsTarget);
                  },
                },
                {
                  id: 'delete',
                  label: t('common.delete'),
                  danger: true,
                  withTopDivider: true,
                  onSelect: () => {
                    setOpenScheduleActionsMenu(null);
                    setDeleteSchedule(scheduleActionsTarget);
                  },
                },
              ]
            : []
        }
      />
      <AdminActionsMenuPortal
        isOpen={Boolean(openRunActionsMenu)}
        top={openRunActionsMenu?.top ?? 0}
        left={openRunActionsMenu?.left ?? 0}
        menuDataAttr="data-run-actions-menu"
        items={
          openRunActionsMenu
            ? [
                ...(openRunActionsMenu.canOpenFile
                  ? [
                      {
                        id: 'file',
                        label: t('admin.parsing.file'),
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          void runModals.openCurrentPlpFile(selectedRun);
                        },
                      },
                    ]
                  : []),
                {
                  id: 'logs',
                  label: t('admin.parsing.logs'),
                  onSelect: () => {
                    const selectedRun = openRunActionsMenu.run;
                    setOpenRunActionsMenu(null);
                    runModals.openLogs(selectedRun);
                  },
                },
                ...(openRunActionsMenu.run.run_type === 'pdp'
                  ? [
                      {
                        id: 'report',
                        label: t('admin.parsing.report'),
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          void runModals.openReport(selectedRun);
                        },
                      },
                    ]
                  : []),
                ...(isRunActive(openRunActionsMenu.run.status)
                  ? [
                      {
                        id: 'cancel',
                        label: t('admin.parsing.cancel'),
                        danger: true,
                        withTopDivider: true,
                        onSelect: () => {
                          const selectedRun = openRunActionsMenu.run;
                          setOpenRunActionsMenu(null);
                          setCancelRun(selectedRun);
                        },
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </>
  );
}
