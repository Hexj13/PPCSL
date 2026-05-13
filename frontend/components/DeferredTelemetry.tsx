'use client';

import { PageScrollTracker } from '@/components/PageScrollTracker';
import { ExternalLinkTracker } from '@/components/analytics/ExternalLinkTracker';
import { WebVitalsAttributionTelemetry } from '@/components/analytics/WebVitalsAttributionTelemetry';
import { NavigationTelemetry } from '@/components/layout/NavigationTelemetry';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { useDeferredLoadAfterIdle } from '@/hooks/useDeferredThirdParty';

export function DeferredTelemetry() {
  const ready = useDeferredLoadAfterIdle(2500);
  if (!ready) return null;
  return (
    <>
      <ServiceWorkerRegistration />
      <PageScrollTracker />
      <NavigationTelemetry />
      <ExternalLinkTracker />
      <WebVitalsAttributionTelemetry />
    </>
  );
}
