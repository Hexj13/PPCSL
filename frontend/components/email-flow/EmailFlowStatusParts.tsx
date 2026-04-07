'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { EmailFlowPageShell } from './EmailFlowPageShell';
import { EMAIL_FLOW_PRIMARY_BUTTON_CLASS } from './constants';

export function EmailFlowSpinner() {
  return (
    <div className="mb-4">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}

export function EmailFlowErrorIcon() {
  return (
    <div className="mb-4">
      <svg
        className="w-16 h-16 mx-auto text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </div>
  );
}

export function EmailFlowSuccessIcon() {
  return (
    <div className="mb-4">
      <svg
        className="w-16 h-16 mx-auto text-primary-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export function EmailFlowLoadingState({ description }: { description?: string }) {
  return (
    <>
      <EmailFlowSpinner />
      {description ? (
        <p className="text-text-secondary text-base leading-relaxed">{description}</p>
      ) : null}
    </>
  );
}

export function EmailFlowErrorState({
  message,
  ctaLabel,
  onCtaClick,
}: {
  message: string;
  ctaLabel: string;
  onCtaClick: () => void;
}) {
  return (
    <>
      <EmailFlowErrorIcon />
      <p className="text-text-secondary mb-6 text-left sm:text-center leading-relaxed">{message}</p>
      <button type="button" onClick={onCtaClick} className={EMAIL_FLOW_PRIMARY_BUTTON_CLASS}>
        {ctaLabel}
      </button>
    </>
  );
}

export function EmailFlowSuccessState({
  description,
  ctaHref,
  ctaLabel,
  footer,
}: {
  description: string;
  ctaHref: string;
  ctaLabel: string;
  footer?: ReactNode;
}) {
  return (
    <>
      <EmailFlowSuccessIcon />
      <p className="text-text-secondary mb-6 leading-relaxed">{description}</p>
      <Link href={ctaHref} className={`${EMAIL_FLOW_PRIMARY_BUTTON_CLASS} block`}>
        {ctaLabel}
      </Link>
      {footer ? <div className="text-sm text-hint mt-4">{footer}</div> : null}
    </>
  );
}

export function EmailFlowSuspenseFallback({ title }: { title: string }) {
  return (
    <EmailFlowPageShell title={title}>
      <EmailFlowSpinner />
    </EmailFlowPageShell>
  );
}
