import type { ParserConfigItem, ParserPdpDefaultsConfig } from '@/lib/config/parser-types';
import { parsersConfig } from '@/lib/config/parsers';

import { normalizeCityName } from './parsing-tab-utils';

export const modalInputClassName = 'input-field w-full';
export const modalFieldLabelClassName = 'block text-sm font-medium text-primary-900 mb-1';
export const modalPrimaryButtonClassName = 'h-[48px] px-3 text-sm';
export const tableHeaderClassName = 'py-3 px-4 text-sm font-semibold text-primary-900';
export const tableCellClassName = 'py-3 px-4 text-sm';
export const tableCenteredCellClassName = `${tableCellClassName} text-center`;
export const tableCenteredSecondaryCellClassName = `${tableCenteredCellClassName} text-text-secondary`;
export const tablePrimaryButtonClassName = 'h-auto px-3 py-1.5 text-sm';
export const parserConfigItems: ParserConfigItem[] = parsersConfig;
export const parserCatalogDefaultCode = parserConfigItems[0]?.code ?? '';
export const cipautoParserCode = 'cipauto';

export const parserPreferredPdpCityNames = new Map(
  parserConfigItems.map((parser) => [
    parser.code,
    new Set(
      [parser.defaultPdpCity, ...(parser.defaultPdpCityNames ?? [])]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => normalizeCityName(value))
        .filter((value) => value.length > 0),
    ),
  ]),
);

export const parserStaticPlpFileNameByCode = new Map(
  parserConfigItems
    .filter(
      (parser) => typeof parser.plpDataPath === 'string' && parser.plpDataPath.trim().length > 0,
    )
    .map((parser) => [parser.code, parser.plpDataPath?.split('/').filter(Boolean).at(-1) ?? '']),
);

export const parserPdpDefaultsByCode = new Map<string, ParserPdpDefaultsConfig>(
  parserConfigItems.map((parser): [string, ParserPdpDefaultsConfig] => [
    parser.code,
    parser.pdpDefaults ?? {},
  ]),
);
