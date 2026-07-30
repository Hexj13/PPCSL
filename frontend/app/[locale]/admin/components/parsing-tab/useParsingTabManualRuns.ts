'use client';

import { useCallback, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserCatalogItem } from '@/lib/api/admin-parsing';
import { toast } from '@/lib/toast';

import type { PdpFormState, PlpFormState } from './parsing-tab-form-types';

type UseParsingTabManualRunsOptions = {
  catalog: ParserCatalogItem[];
  catalogLoading: boolean;
  defaultParserCode: string;
  plpForm: PlpFormState;
  pdpForm: PdpFormState;
  plpScanInputMode: 'pages' | 'profile_login';
  pdpAssignValidation: { status: string };
  plpRunsReload: (_force?: boolean) => void;
  pdpRunsReload: (_force?: boolean) => void;
  onPlpModalClose: () => void;
  onPdpModalClose: () => void;
};

export function useParsingTabManualRuns({
  catalog,
  catalogLoading,
  defaultParserCode,
  plpForm,
  pdpForm,
  plpScanInputMode,
  pdpAssignValidation,
  plpRunsReload,
  pdpRunsReload,
  onPlpModalClose,
  onPdpModalClose,
}: UseParsingTabManualRunsOptions) {
  const { t } = useTranslation();

  const [plpModalOpen, setPlpModalOpen] = useState(false);
  const [pdpModalOpen, setPdpModalOpen] = useState(false);
  const [plpSubmitting, setPlpSubmitting] = useState(false);
  const [pdpSubmitting, setPdpSubmitting] = useState(false);

  const openPlpModal = useCallback(() => setPlpModalOpen(true), []);
  const closePlpModal = useCallback(() => {
    setPlpModalOpen(false);
    onPlpModalClose();
  }, [onPlpModalClose]);

  const openPdpModal = useCallback(() => setPdpModalOpen(true), []);
  const closePdpModal = useCallback(() => {
    setPdpModalOpen(false);
    onPdpModalClose();
  }, [onPdpModalClose]);

  const submitPlp = useCallback(async () => {
    if (plpSubmitting) {
      return;
    }
    if (plpScanInputMode === 'profile_login' && !plpForm.login.trim()) {
      toast.error(t('admin.parsing.loginRequired'));
      return;
    }
    setPlpSubmitting(true);
    try {
      await adminApi.createPlpRun({
        parserCode: plpForm.parserCode || defaultParserCode,
        scanMode: plpScanInputMode === 'pages' ? plpForm.scanMode : undefined,
        pagesFirst:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'first_n'
            ? plpForm.pagesFirst
            : undefined,
        pageFrom:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'range'
            ? plpForm.pageFrom
            : undefined,
        pageTo:
          plpScanInputMode === 'pages' && plpForm.scanMode === 'range' ? plpForm.pageTo : undefined,
        login: plpScanInputMode === 'profile_login' ? plpForm.login.trim() : undefined,
        pageSize: plpScanInputMode === 'profile_login' ? plpForm.pageSize : undefined,
        maxItems:
          plpScanInputMode === 'profile_login' && plpForm.maxItems.trim()
            ? Number(plpForm.maxItems)
            : undefined,
        delayMs: plpForm.delayMs,
        dryRun: plpForm.dryRun,
      });
      toast.success(t('admin.parsing.runStarted'));
      setPlpModalOpen(false);
      plpRunsReload(true);
    } catch {
      toast.error(t('admin.parsing.runStartError'));
    } finally {
      setPlpSubmitting(false);
    }
  }, [defaultParserCode, plpForm, plpRunsReload, plpScanInputMode, plpSubmitting, t]);

  const submitPdp = useCallback(async () => {
    if (pdpSubmitting) {
      return;
    }
    if (pdpAssignValidation.status !== 'valid') {
      toast.error(t('admin.parsing.assignUserRequired'));
      return;
    }
    if (!pdpForm.city.trim()) {
      toast.error(t('admin.parsing.cityRequired'));
      return;
    }
    if (!pdpForm.plpFileKey.trim()) {
      toast.error(t('admin.parsing.plpFileRequired'));
      return;
    }
    setPdpSubmitting(true);
    try {
      await adminApi.createPdpRun({
        parserCode: pdpForm.parserCode || defaultParserCode,
        plpFileKey: pdpForm.plpFileKey,
        assignedUserId: pdpForm.assignedUserId.trim(),
        listingStatus: pdpForm.listingStatus,
        limit: pdpForm.limit.trim() ? Number(pdpForm.limit) : undefined,
        resume: pdpForm.resume,
        dryRun: pdpForm.dryRun,
        onlyFailed: pdpForm.onlyFailed,
        updateExisting: pdpForm.updateExisting,
        registrationType: pdpForm.registrationType,
        defaultHp: pdpForm.defaultHp,
        city: pdpForm.city.trim(),
        delayMs: pdpForm.delayMs,
        removeClosed: pdpForm.removeClosed,
        forceClose: pdpForm.forceClose,
        checkUserDuplicatesBeforeCreate: pdpForm.checkUserDuplicatesBeforeCreate,
        autoCreateBrands: pdpForm.autoCreateBrands,
        autoCreateModels: pdpForm.autoCreateModels,
      });
      toast.success(t('admin.parsing.runStarted'));
      setPdpModalOpen(false);
      pdpRunsReload(true);
    } catch {
      toast.error(t('admin.parsing.runStartError'));
    } finally {
      setPdpSubmitting(false);
    }
  }, [defaultParserCode, pdpAssignValidation.status, pdpForm, pdpRunsReload, pdpSubmitting, t]);

  const plpSubmitDisabled =
    catalogLoading ||
    plpSubmitting ||
    !catalog.some((c) => c.code === plpForm.parserCode && c.manualRunEnabled) ||
    (plpScanInputMode === 'profile_login' && !plpForm.login.trim());

  const pdpSubmitDisabled =
    catalogLoading ||
    pdpSubmitting ||
    pdpAssignValidation.status !== 'valid' ||
    !pdpForm.plpFileKey.trim() ||
    !pdpForm.city.trim() ||
    !catalog.some((c) => c.code === pdpForm.parserCode && c.manualRunEnabled);

  return {
    plpModalOpen,
    pdpModalOpen,
    plpSubmitting,
    pdpSubmitting,
    openPlpModal,
    closePlpModal,
    openPdpModal,
    closePdpModal,
    submitPlp,
    submitPdp,
    plpSubmitDisabled,
    pdpSubmitDisabled,
  };
}
