import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const DRAWER_ANIM_MS = 240;

export function useNavDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const lockedRef = useRef(false);

  const openDrawer = useCallback(() => {
    if (lockedRef.current) return;
    setMounted(true);
    setClosing(false);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    if (!mounted || lockedRef.current) return;
    setClosing(true);
    setOpen(false);
    lockedRef.current = true;
    setTimeout(() => {
      setMounted(false);
      setClosing(false);
      lockedRef.current = false;
    }, DRAWER_ANIM_MS);
  }, [mounted]);

  const toggleDrawer = useCallback(() => {
    if (open) closeDrawer();
    else openDrawer();
  }, [open, openDrawer, closeDrawer]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return {
    open,
    mounted,
    closing,
    animMs: DRAWER_ANIM_MS,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
