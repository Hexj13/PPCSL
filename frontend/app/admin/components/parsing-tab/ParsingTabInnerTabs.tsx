'use client';

import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingTabInnerTabs(c: ParsingTabControllerState) {
  const {
    t,
    innerTab,
    setInnerTab,
    plpTabRef,
    pdpTabRef,
    schedulerTabRef,
    tabsContainerRef,
    indicatorRef,
    indicatorStyle,
    tabButtonClassName,
  } = c;
  return (
    <div className="border-b border-primary-500/20">
      <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
        <div className="relative flex gap-1 min-w-max">
          {(['plp', 'pdp', 'scheduler'] as const).map((tab) => (
            <button
              key={tab}
              ref={tab === 'plp' ? plpTabRef : tab === 'pdp' ? pdpTabRef : schedulerTabRef}
              type="button"
              onClick={() => setInnerTab(tab)}
              className={tabButtonClassName(innerTab === tab)}
            >
              {tab === 'plp'
                ? t('admin.parsing.subtabPlp')
                : tab === 'pdp'
                  ? t('admin.parsing.subtabPdp')
                  : t('admin.parsing.subtabScheduler')}
            </button>
          ))}
          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
            style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
          />
        </div>
      </div>
    </div>
  );
}
