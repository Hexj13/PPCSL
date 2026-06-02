'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi } from '@/lib/api';
import type { ParserCatalogItem, ParserPlpFileOption } from '@/lib/api/admin-parsing';
import { citiesApi } from '@/lib/api/api-cities';
import type { City } from '@/lib/api/api-types';
import { toast } from '@/lib/toast';

import { parserCatalogDefaultCode } from './parsing-tab-constants';
import type { PlpFormState, PdpFormState, ScheduleFormState } from './parsing-tab-form-types';
import type { PlpScanMode } from './parsing-tab-types';
import {
  getDefaultPdpCity,
  getDefaultPlpScanMode,
  getParserPdpDefaults,
} from './parsing-tab-utils';

type UseParsingTabCatalogOptions = {
  setPlpForm: Dispatch<SetStateAction<PlpFormState>>;
  setPdpForm: Dispatch<SetStateAction<PdpFormState>>;
  setScheduleForm: Dispatch<SetStateAction<ScheduleFormState>>;
  isActive: boolean;
  onCatalogRefresh?: () => void;
};

export function useParsingTabCatalog({
  setPlpForm,
  setPdpForm,
  setScheduleForm,
  isActive,
}: UseParsingTabCatalogOptions) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const [cities, setCities] = useState<City[]>([]);
  const citiesRef = useRef<City[]>([]);
  citiesRef.current = cities;
  const [catalog, setCatalog] = useState<ParserCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [plpFilesByParser, setPlpFilesByParser] = useState<Record<string, ParserPlpFileOption[]>>(
    {},
  );

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: city.name,
        label: locale === 'ru' && city.nameRu ? `${city.nameRu} (${city.name})` : city.name,
      })),
    [cities, locale],
  );

  const defaultParserCode = useMemo(() => catalog[0]?.code ?? parserCatalogDefaultCode, [catalog]);

  const manualRunParserOptions = useMemo(
    () =>
      catalog
        .filter((c) => c.manualRunEnabled)
        .map((c) => ({
          value: c.code,
          label: c.label,
        })),
    [catalog],
  );

  const schedulerParserOptions = useMemo(
    () =>
      catalog
        .filter((c) => c.schedulerEnabled)
        .map((c) => ({
          value: c.code,
          label: c.label,
        })),
    [catalog],
  );

  const loadParserPlpFiles = useCallback(
    async (parserCode: string) => {
      if (!parserCode) {
        return;
      }
      try {
        const res = await adminApi.getParserPlpFiles(parserCode);
        setPlpFilesByParser((prev) => ({ ...prev, [parserCode]: res.data.data ?? [] }));
      } catch {
        toast.error(t('admin.parsing.plpFilesLoadError'));
      }
    },
    [t],
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await adminApi.getCatalog();
      setCatalog(res.data.data);
    } catch {
      toast.error(t('admin.parsing.catalogLoadError'));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.getCatalog();
        if (cancelled) return;
        setCatalog(res.data.data);
        const firstManualParser = res.data.data.find((item) => item.manualRunEnabled);
        const firstManual = firstManualParser?.code ?? parserCatalogDefaultCode;
        const firstScheduler =
          res.data.data.find((item) => item.schedulerEnabled)?.code ?? firstManual;
        const cityList = citiesRef.current;
        setPlpForm((s) => ({
          ...s,
          parserCode: firstManual,
          scanMode: getDefaultPlpScanMode(firstManual),
          pagesFirst: 1,
          pageFrom: 1,
          pageTo: 1,
          login: '',
          pageSize: 50,
          maxItems: '',
        }));
        setPdpForm((s) => {
          const pdpDefaults = getParserPdpDefaults(firstManual);
          const next = { ...s, parserCode: firstManual };
          next.plpFileKey = '';
          next.listingStatus = pdpDefaults.listingStatus;
          next.registrationType = pdpDefaults.registrationType;
          next.defaultHp = pdpDefaults.defaultHp;
          next.delayMs = pdpDefaults.delayMs;
          next.resume = pdpDefaults.resume;
          next.dryRun = pdpDefaults.dryRun;
          next.removeClosed = pdpDefaults.removeClosed;
          next.onlyFailed = pdpDefaults.onlyFailed;
          next.updateExisting = pdpDefaults.updateExisting;
          next.checkUserDuplicatesBeforeCreate = false;
          next.autoCreateBrands = pdpDefaults.autoCreateBrands;
          next.autoCreateModels = pdpDefaults.autoCreateModels;
          if (cityList.length > 0) {
            next.city = getDefaultPdpCity(firstManual, cityList);
          }
          return next;
        });
        setScheduleForm((s) => {
          const pdpDefaults = getParserPdpDefaults(firstScheduler);
          const next = { ...s, parserCode: firstScheduler };
          next.plpScanMode = getDefaultPlpScanMode(firstScheduler) as PlpScanMode;
          next.pdpPlpFileKey = '';
          next.pdpListingStatus = pdpDefaults.listingStatus;
          next.pdpRegistrationType = pdpDefaults.registrationType;
          next.pdpDefaultHp = pdpDefaults.defaultHp;
          next.pdpDelayMs = pdpDefaults.delayMs;
          next.pdpRemoveClosed = pdpDefaults.removeClosed;
          next.pdpOnlyFailed = pdpDefaults.onlyFailed;
          next.pdpUpdateExisting = pdpDefaults.updateExisting;
          next.pdpCheckUserDuplicatesBeforeCreate = false;
          next.pdpAutoCreateBrands = pdpDefaults.autoCreateBrands;
          next.pdpAutoCreateModels = pdpDefaults.autoCreateModels;
          if (cityList.length > 0) {
            next.pdpCity = getDefaultPdpCity(firstScheduler, cityList);
          }
          return next;
        });
      } catch {
        toast.error(t('admin.parsing.catalogLoadError'));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPdpForm, setPlpForm, setScheduleForm, t]);

  useEffect(() => {
    void citiesApi.getAll().then((res) => {
      setCities(res.data);
      if (res.data[0]?.name) {
        setPdpForm((s) => (s.city ? s : { ...s, city: getDefaultPdpCity(s.parserCode, res.data) }));
        setScheduleForm((s) =>
          s.pdpCity ? s : { ...s, pdpCity: getDefaultPdpCity(s.parserCode, res.data) },
        );
      }
    });
  }, [setPdpForm, setScheduleForm]);

  const getParserLabel = useCallback(
    (parserCode: string) => catalog.find((item) => item.code === parserCode)?.label ?? parserCode,
    [catalog],
  );

  const getTranslatedParsingValue = useCallback(
    (group: string, value: string | null | undefined) => {
      if (!value) return '—';

      const translationKey = `admin.parsing.${group}.${value}`;
      const translated = t(translationKey);

      return translated === translationKey ? value : translated;
    },
    [t],
  );

  return {
    cities,
    catalog,
    catalogLoading,
    plpFilesByParser,
    cityOptions,
    defaultParserCode,
    manualRunParserOptions,
    schedulerParserOptions,
    loadParserPlpFiles,
    refreshCatalog,
    getParserLabel,
    getTranslatedParsingValue,
    isActive,
  };
}
