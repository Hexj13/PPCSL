import type { ParserAvailabilityProbeConfig, ParserConfigItem } from '../../common/config/parsers';
import { parsersConfig } from '../../common/config/parsers';
import type { ParserAdminAvailability, ParserReleaseStage, ParserRunType } from '../domain/types';

export interface ParserCatalogItem {
  code: string;
  label: string;
  domain: string;
  supportedRunTypes: ParserRunType[];
  scanInputMode?: 'pages' | 'profile_login';
  adminAvailability: ParserAdminAvailability;
  releaseStage: ParserReleaseStage;
  isVisibleInAdmin: boolean;
  manualRunEnabled: boolean;
  schedulerEnabled: boolean;
  cliScript: string;
  plpMode: 'mono' | 'multi';
  plpDataPath?: string;
  defaultPdpCity?: string;
  defaultPdpCityNames?: string[];
  availabilityProbe?: ParserAvailabilityProbeConfig;
  registrySyncEnabled?: boolean;
}

const parserCatalog: ParserCatalogItem[] = parsersConfig.map((item: ParserConfigItem) => ({
  code: item.code,
  label: item.label,
  domain: item.domain,
  supportedRunTypes: item.supportedRunTypes,
  scanInputMode: item.scanInputMode,
  adminAvailability: item.adminAvailability,
  releaseStage: item.releaseStage,
  isVisibleInAdmin: item.isVisibleInAdmin,
  manualRunEnabled: item.manualRunEnabled,
  schedulerEnabled: item.schedulerEnabled,
  cliScript: item.cliScript,
  plpMode: item.plpMode,
  plpDataPath: item.plpDataPath,
  defaultPdpCity: item.defaultPdpCity,
  defaultPdpCityNames: item.defaultPdpCityNames,
  availabilityProbe: item.availabilityProbe,
  registrySyncEnabled: item.registrySyncEnabled,
}));

export function getParserCatalog(): ParserCatalogItem[] {
  return parserCatalog;
}

export function getParserCatalogItem(code: string): ParserCatalogItem | undefined {
  return parserCatalog.find((p) => p.code === code);
}

export function getParserCatalogForAdminApi(): ParserCatalogItem[] {
  return parserCatalog.filter((p) => p.isVisibleInAdmin && p.adminAvailability !== 'hidden');
}
