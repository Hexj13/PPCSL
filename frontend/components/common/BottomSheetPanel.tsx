'use client';

import type { RefObject } from 'react';

import { BOTTOM_SHEET_TRANSITION_MS } from '@/lib/bottom-sheet-layout';

type BottomSheetPanelProps = {
  sheetRef: RefObject<HTMLDivElement | null>;
  dataTestId?: string;
  panelStyle: React.CSSProperties;
  exiting: boolean;
  visible: boolean;
  title: string;
  closeLabel: string;
  lockSheetHeight: boolean;
  keyboardInsetBottomPx: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onRequestClose: () => void;
  onTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
  onDragPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
};

export function BottomSheetPanel({
  sheetRef,
  dataTestId,
  panelStyle,
  exiting,
  visible,
  title,
  closeLabel,
  lockSheetHeight,
  keyboardInsetBottomPx,
  footer,
  children,
  onRequestClose,
  onTransitionEnd,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onDragPointerCancel,
}: BottomSheetPanelProps) {
  const keyboardSkirtHeightPx = lockSheetHeight ? 0 : keyboardInsetBottomPx;

  return (
    <div
      data-testid="bottom-sheet-panel-anchor"
      onTransitionEnd={onTransitionEnd}
      className={`pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ transitionDuration: `${BOTTOM_SHEET_TRANSITION_MS}ms` }}
    >
      <div
        ref={sheetRef}
        data-testid={dataTestId}
        style={panelStyle}
        className={`flex min-h-0 w-full flex-col overflow-hidden rounded-t-xl bg-bg-base shadow-xl ${
          exiting ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerCancel}
      >
        <div
          data-bottom-sheet-handle
          className="flex shrink-0 cursor-grab justify-center pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] touch-none active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-primary-500/35" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary-500/20 px-4 pb-3">
          <h2 id="bottom-sheet-title" className="truncate text-lg font-bold text-primary-900">
            {title}
          </h2>
          <button
            type="button"
            data-testid="bottom-sheet-close"
            onClick={onRequestClose}
            className="shrink-0 p-1 text-3xl leading-none text-primary-700 hover-only:hover:text-primary-900"
            aria-label={closeLabel}
          >
            ×
          </button>
        </div>
        <div
          className={
            lockSheetHeight
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain'
              : `min-h-0 max-h-full shrink overflow-x-hidden overscroll-y-contain${
                  footer ? '' : ' pb-[max(1rem,env(safe-area-inset-bottom))]'
                }`
          }
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-primary-500/20 bg-bg-base px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : null}
      </div>
      {keyboardSkirtHeightPx > 0 ? (
        <div
          data-testid="bottom-sheet-keyboard-spacer"
          className="pointer-events-auto absolute left-0 right-0 top-full bg-bg-base"
          style={{ height: `${keyboardSkirtHeightPx}px` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
