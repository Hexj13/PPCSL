'use client';

import { useEffect } from 'react';

export function ResourceHints() {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const apiHost = new URL(apiUrl).origin;

      const preconnectApi = document.createElement('link');
      preconnectApi.rel = 'preconnect';
      preconnectApi.href = apiHost;
      preconnectApi.crossOrigin = 'anonymous';

      if (!document.querySelector(`link[rel="preconnect"][href="${apiHost}"]`)) {
        document.head.appendChild(preconnectApi);
      }

      const dnsPrefetchGoogle = document.createElement('link');
      dnsPrefetchGoogle.rel = 'dns-prefetch';
      dnsPrefetchGoogle.href = 'https://www.googletagmanager.com';

      if (
        !document.querySelector('link[rel="dns-prefetch"][href="https://www.googletagmanager.com"]')
      ) {
        document.head.appendChild(dnsPrefetchGoogle);
      }

      const preconnectGoogle = document.createElement('link');
      preconnectGoogle.rel = 'preconnect';
      preconnectGoogle.href = 'https://www.googletagmanager.com';
      preconnectGoogle.crossOrigin = 'anonymous';

      if (
        !document.querySelector(`link[rel="preconnect"][href="https://www.googletagmanager.com"]`)
      ) {
        document.head.appendChild(preconnectGoogle);
      }
    } catch (error) {
      console.error('Failed to add resource hints:', error);
    }
  }, []);

  return null;
}
