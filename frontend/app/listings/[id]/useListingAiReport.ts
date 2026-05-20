'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Listing, ListingAiReportPayload } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { buildSignInHref } from '@/lib/return-url';
import { getListingHref, isTireListing } from '@/lib/utils';

import type { ListingAiReportModalPhase } from './ListingPageAiReportModal';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortedAiReportRequest(err: unknown): boolean {
  if (axios.isCancel(err)) {
    return true;
  }
  if (axios.isAxiosError(err)) {
    return err.code === 'ERR_CANCELED' || err.name === 'CanceledError';
  }
  return false;
}

export function useListingAiReport(options: {
  listingId: string;
  listing: Listing | null;
  user: { id: string } | null;
  isInitialized: boolean;
  locale: string;
  isHydrated: boolean;
  router: { push: (href: string) => void; replace: (href: string) => void };
}) {
  const { listingId: id, listing, user, isInitialized, locale, isHydrated, router } = options;

  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [aiReportPhase, setAiReportPhase] = useState<ListingAiReportModalPhase>('idle');
  const [aiReportPayload, setAiReportPayload] = useState<ListingAiReportPayload | null>(null);
  const [aiReportMessage, setAiReportMessage] = useState<string | null>(null);
  const aiReportAbortRef = useRef<AbortController | null>(null);
  const aiReportPollInFlightRef = useRef(false);
  const consumedOpenAiReportRef = useRef(false);

  useEffect(() => {
    consumedOpenAiReportRef.current = false;
    aiReportAbortRef.current?.abort();
    aiReportAbortRef.current = null;
    setAiReportModalOpen(false);
    setAiReportPhase('idle');
    setAiReportPayload(null);
    setAiReportMessage(null);
  }, [id]);

  useEffect(() => {
    return () => {
      aiReportAbortRef.current?.abort();
      aiReportAbortRef.current = null;
    };
  }, []);

  const runAiReportPoll = useCallback(async () => {
    if (aiReportPollInFlightRef.current) {
      return;
    }
    aiReportPollInFlightRef.current = true;
    const ac = new AbortController();
    aiReportAbortRef.current = ac;
    const reportLanguage: 'ru' | 'ro' = locale === 'ru' ? 'ru' : 'ro';
    const maxWaitMs = 180_000;
    const started = Date.now();
    let delayMs = 1500;
    try {
      while (Date.now() - started < maxWaitMs) {
        if (ac.signal.aborted) {
          return;
        }
        try {
          const { data } = await listingsApi.postAiReport(id, {
            signal: ac.signal,
            reportLanguage,
          });
          if (data.status === 'ready') {
            setAiReportPhase('ready');
            setAiReportPayload(data.report);
            setAiReportMessage(null);
            return;
          }
          if (data.status === 'pending') {
            setAiReportPhase('pending');
            await sleep(delayMs);
            delayMs = Math.min(Math.round(delayMs * 1.35), 12_000);
            continue;
          }
          if (data.status === 'unavailable') {
            setAiReportPhase('unavailable');
            setAiReportPayload(null);
            setAiReportMessage(data.message);
            return;
          }
          if (data.status === 'rate_limited') {
            setAiReportPhase('rate_limited');
            setAiReportPayload(null);
            setAiReportMessage(data.message);
            return;
          }
        } catch (err) {
          if (isAbortedAiReportRequest(err)) {
            return;
          }
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            const body = err.response.data as { status?: string; message?: string } | undefined;
            if (body?.status === 'rate_limited' && typeof body.message === 'string') {
              setAiReportPhase('rate_limited');
              setAiReportMessage(body.message);
              return;
            }
          }
          setAiReportPhase('unavailable');
          setAiReportPayload(null);
          setAiReportMessage(null);
          return;
        }
      }
      setAiReportPhase('unavailable');
      setAiReportPayload(null);
      setAiReportMessage(null);
    } finally {
      aiReportPollInFlightRef.current = false;
      if (aiReportAbortRef.current === ac) {
        aiReportAbortRef.current = null;
      }
    }
  }, [id, locale]);

  const closeAiReportModal = useCallback(() => {
    setAiReportModalOpen(false);
  }, []);

  const handleAiReportClick = useCallback(() => {
    if (listing?.status === 'Closed') {
      return;
    }
    if (aiReportPhase === 'loading' || aiReportPhase === 'pending') {
      setAiReportModalOpen(true);
      return;
    }
    if (aiReportPhase === 'ready') {
      setAiReportModalOpen(true);
      return;
    }
    if (!listing || isTireListing(listing)) {
      return;
    }
    if (!user || !isInitialized) {
      if (typeof window === 'undefined') {
        return;
      }
      const qs = new URLSearchParams(window.location.search);
      qs.set('openAiReport', '1');
      const query = qs.toString();
      const basePath =
        listing != null
          ? getListingHref(listing)
          : typeof window !== 'undefined'
            ? window.location.pathname
            : `/listings/${id}`;
      const returnPath = query ? `${basePath}?${query}` : basePath;
      router.push(buildSignInHref(returnPath));
      return;
    }
    setAiReportModalOpen(true);
    setAiReportPhase('loading');
    setAiReportPayload(null);
    setAiReportMessage(null);
    void runAiReportPoll();
  }, [aiReportPhase, listing, user, isInitialized, id, router, runAiReportPoll]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!isHydrated || !isInitialized || !user || !listing) {
      return;
    }
    if (isTireListing(listing)) {
      return;
    }
    if (consumedOpenAiReportRef.current) {
      return;
    }
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('openAiReport') !== '1') {
      return;
    }
    consumedOpenAiReportRef.current = true;
    sp.delete('openAiReport');
    const qs = sp.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    router.replace(nextUrl);
    if (listing.status === 'Closed') {
      return;
    }
    setAiReportModalOpen(true);
    setAiReportPhase('loading');
    setAiReportPayload(null);
    setAiReportMessage(null);
    void runAiReportPoll();
  }, [isHydrated, isInitialized, user, listing, id, router, runAiReportPoll]);

  return {
    aiReportModalOpen,
    aiReportPhase,
    aiReportPayload,
    aiReportMessage,
    handleAiReportClick,
    closeAiReportModal,
  };
}
