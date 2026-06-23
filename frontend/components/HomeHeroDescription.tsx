'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const COLLAPSED_DESCRIPTION_WORD_COUNT = 6;
const DESCRIPTION_FADE_DURATION_MS = 200;

type HomeHeroDescriptionProps = {
  descriptionIntro: string;
  descriptionDetails: string;
  expandLabel: string;
  collapseLabel: string;
};

function getDescriptionParts(text: string): { visibleText: string; hiddenText: string } {
  const words = text.trim().split(/\s+/);

  if (words.length <= COLLAPSED_DESCRIPTION_WORD_COUNT) {
    return { visibleText: text, hiddenText: '' };
  }

  return {
    visibleText: words.slice(0, COLLAPSED_DESCRIPTION_WORD_COUNT).join(' '),
    hiddenText: words.slice(COLLAPSED_DESCRIPTION_WORD_COUNT).join(' '),
  };
}

function splitTrailingWord(text: string): { prefix: string; suffix: string } {
  const trimmedText = text.trim();
  const lastSpaceIndex = trimmedText.lastIndexOf(' ');

  if (lastSpaceIndex === -1) {
    return { prefix: '', suffix: trimmedText };
  }

  return {
    prefix: trimmedText.slice(0, lastSpaceIndex),
    suffix: trimmedText.slice(lastSpaceIndex + 1),
  };
}

export function HomeHeroDescription({
  descriptionIntro,
  descriptionDetails,
  expandLabel,
  collapseLabel,
}: HomeHeroDescriptionProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionDetailsMounted, setIsDescriptionDetailsMounted] = useState(false);
  const [isDescriptionDetailsVisible, setIsDescriptionDetailsVisible] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState<number | null>(null);
  const descriptionContentRef = useRef<HTMLParagraphElement>(null);
  const fullDescription = `${descriptionIntro} ${descriptionDetails}`;
  const { visibleText: descriptionVisibleText, hiddenText: descriptionHiddenText } =
    getDescriptionParts(fullDescription);
  const { prefix: descriptionHiddenPrefix, suffix: descriptionHiddenSuffix } =
    splitTrailingWord(descriptionHiddenText);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let animationFrameId: number | undefined;

    if (isDescriptionExpanded) {
      setIsDescriptionDetailsMounted(true);
      animationFrameId = window.requestAnimationFrame(() => {
        setIsDescriptionDetailsVisible(true);
      });
    } else {
      setIsDescriptionDetailsVisible(false);
      timeoutId = setTimeout(() => {
        setIsDescriptionDetailsMounted(false);
      }, DESCRIPTION_FADE_DURATION_MS);
    }

    return () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [isDescriptionExpanded]);

  useLayoutEffect(() => {
    if (!descriptionContentRef.current) return;

    const measureDescriptionHeight = () => {
      if (descriptionContentRef.current) {
        setDescriptionHeight(descriptionContentRef.current.scrollHeight);
      }
    };

    measureDescriptionHeight();

    const observer = new ResizeObserver(measureDescriptionHeight);
    observer.observe(descriptionContentRef.current);

    return () => observer.disconnect();
  }, [
    descriptionHiddenText,
    descriptionVisibleText,
    isDescriptionDetailsMounted,
    isDescriptionExpanded,
  ]);

  const renderDescriptionButton = (label: string, tabIndex?: 0 | -1) => {
    return (
      <button
        type="button"
        className="header-desktop-nav-link ml-1 inline text-primary-500 transition-colors hover-only:hover:text-primary-700 focus-visible:outline-none"
        aria-expanded={isDescriptionExpanded}
        tabIndex={tabIndex}
        onClick={() => setIsDescriptionExpanded((expanded) => !expanded)}
      >
        <span className="header-desktop-nav-link-label">{label}</span>
      </button>
    );
  };

  return (
    <div className="mt-4 max-w-4xl text-base font-medium leading-relaxed text-text-secondary">
      <div
        className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height: descriptionHeight === null ? 'auto' : `${descriptionHeight}px` }}
      >
        <p ref={descriptionContentRef}>
          {descriptionVisibleText}
          {isDescriptionDetailsMounted && descriptionHiddenText && (
            <>
              {' '}
              <span
                className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                  isDescriptionDetailsVisible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {descriptionHiddenPrefix && `${descriptionHiddenPrefix} `}
                <span className="whitespace-nowrap">
                  {descriptionHiddenSuffix}
                  {renderDescriptionButton(collapseLabel, isDescriptionExpanded ? 0 : -1)}
                </span>
              </span>
            </>
          )}
          {!isDescriptionDetailsMounted && (
            <span className="whitespace-nowrap">
              ...
              {renderDescriptionButton(expandLabel)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
