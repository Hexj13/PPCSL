'use client';

import { useEffect, useMemo, useState } from 'react';

import { isInstalledWebApp } from '@/lib/is-installed-web-app';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkInstalled = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        window.innerWidth <= 768;

      const isInStandaloneMode = isInstalledWebApp();

      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
      setIsMobile(isMobileDevice);
      setIsStandalone(isInStandaloneMode);
      setIsInstalled(isInStandaloneMode);
      setIsReady(true);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error installing PWA:', error);
        setDeferredPrompt(null);
        return false;
      }
    }

    return false;
  };

  const canInstall = useMemo(() => {
    if (!isReady) return false;
    if (isInstalled || isStandalone) return false;

    if (isIOS && !isStandalone) {
      return true;
    }

    if (deferredPrompt) {
      return true;
    }

    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent);
      const isEdge = /edg/i.test(userAgent);
      const isSamsung = /samsungbrowser/i.test(userAgent);
      const isFirefox = /firefox/i.test(userAgent);
      const isOpera = /opr/i.test(userAgent);

      if ((isChrome || isEdge || isSamsung || isFirefox || isOpera) && !isStandalone) {
        return true;
      }
    }

    return false;
  }, [isReady, isInstalled, isStandalone, isIOS, deferredPrompt]);

  return {
    canInstall,
    isInstalled,
    isAndroid,
    isIOS,
    isMobile,
    isStandalone,
    isReady,
    hasDeferredPrompt: !!deferredPrompt,
    install,
  };
}
