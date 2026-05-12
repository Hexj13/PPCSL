'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

import { subscribeWindowScrollFrame } from '@/lib/window-scroll-bus';

export function BackgroundDecorations() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastVisibleRef = useRef(true);

  useEffect(() => {
    setMounted(true);

    const tick = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const visible = scrollY < 100;
      if (lastVisibleRef.current !== visible) {
        lastVisibleRef.current = visible;
        setIsVisible(visible);
      }
    };

    tick();
    return subscribeWindowScrollFrame(tick);
  }, []);

  if (!mounted) return null;

  const content = (
    <div
      className="background-diamonds"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        contain: 'layout paint size',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 19px, rgba(0, 0, 0, 0.072) 20px, rgba(0, 0, 0, 0.018) 21px, transparent 22px),
          repeating-linear-gradient(-45deg, transparent, transparent 19px, rgba(0, 0, 0, 0.072) 20px, rgba(0, 0, 0, 0.018) 21px, transparent 22px)
        `,
        backgroundSize: '40px 40px',
        maskImage: `
          linear-gradient(to bottom, black 0%, black 60%, transparent 90%, transparent 100%),
          linear-gradient(to right, black 0%, black 40%, transparent 70%, transparent 100%)
        `,
        WebkitMaskImage: `
          linear-gradient(to bottom, black 0%, black 60%, transparent 90%, transparent 100%),
          linear-gradient(to right, black 0%, black 40%, transparent 70%, transparent 100%)
        `,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }}
    />
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
