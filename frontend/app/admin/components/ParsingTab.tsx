'use client';

import { ParsingTabView } from './parsing-tab/ParsingTabView';
import type { ParsingTabProps } from './parsing-tab/parsing-tab-types';
import { useParsingTabController } from './parsing-tab/useParsingTabController';

export function ParsingTab(props: ParsingTabProps) {
  return <ParsingTabView {...useParsingTabController(props)} />;
}
