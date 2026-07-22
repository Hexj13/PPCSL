'use client';

import { ParsingTabInnerTabs } from './ParsingTabInnerTabs';
import { ParsingTabModals } from './ParsingTabModals';
import { ParsingTabPdpPanel } from './ParsingTabPdpPanel';
import { ParsingTabPlpPanel } from './ParsingTabPlpPanel';
import { ParsingTabSchedulerPanel } from './ParsingTabSchedulerPanel';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabView(c: ParsingTabControllerState) {
  return (
    <div className="space-y-6">
      <ParsingTabInnerTabs {...c} />
      {c.innerTab === 'plp' && <ParsingTabPlpPanel {...c} />}
      {c.innerTab === 'pdp' && <ParsingTabPdpPanel {...c} />}
      {c.innerTab === 'scheduler' && <ParsingTabSchedulerPanel {...c} />}
      <ParsingTabModals {...c} />
    </div>
  );
}
