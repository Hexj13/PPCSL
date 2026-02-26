'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export function BackgroundDecorations() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastVisibleRef = useRef(true);
  const rafIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);

    const tick = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const visible = scrollY < 100;
      if (lastVisibleRef.current !== visible) {
        lastVisibleRef.current = visible;
        setIsVisible(visible);
      }
      rafIdRef.current = 0;
    };

    const handleScroll = () => {
      if (rafIdRef.current === 0) {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    tick();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== 0) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  if (!mounted) return null;

  const content = (
    <div
      className="background-diamonds"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
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
