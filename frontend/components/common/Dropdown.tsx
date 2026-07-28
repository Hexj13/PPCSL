'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from 'react';
import { createPortal } from 'react-dom';

import { useTranslation } from '@/hooks/useTranslation';
import { addCoalescedResizeListener } from '@/lib/resize-coalesced';

import { DropdownMenu, DropdownTrigger } from './Dropdown.parts';
import type { DropdownOption } from './dropdown-types';

const HEADER_OFFSET_PX = 108;
const MOBILE_BREAKPOINT_PX = 768;

export const ScrollDropdownIntoViewContext = createContext(false);

function getDropdownTargetScrollY(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return Math.max(0, window.scrollY + rect.top - HEADER_OFFSET_PX);
}

function smoothScrollTriggerBelowHeader(
  el: HTMLElement,
  onFrame: (_frameId: number | null) => void,
): Promise<void> {
  const targetScrollY = getDropdownTargetScrollY(el);

  if (Math.abs(window.scrollY - targetScrollY) < 2) {
    return Promise.resolve();
  }

  window.scrollTo({ top: targetScrollY, behavior: 'smooth' });

  return new Promise((resolve) => {
    const startedAt = performance.now();

    const checkScroll = () => {
      if (Math.abs(window.scrollY - targetScrollY) < 2 || performance.now() - startedAt > 500) {
        onFrame(null);
        resolve();
        return;
      }

      const frameId = requestAnimationFrame(checkScroll);
      onFrame(frameId);
    };

    const frameId = requestAnimationFrame(checkScroll);
    onFrame(frameId);
  });
}

interface DropdownProps {
  value: string;
  onChange: (_value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  searchable?: boolean;
  showActionButtons?: boolean;
  error?: boolean;
  autoPosition?: boolean;
  renderMenuInPortal?: boolean;
  rightIcon?: React.ReactNode;
  fieldLabel?: string;
  fieldLabelIcon?: React.ReactNode;
  fieldLabelTrailing?: React.ReactNode;
  menuMaxHeight?: number;
  menuSelectedStyle?: 'background' | 'checkmark';
  menuExpandToContent?: boolean;
  clearOption?: {
    label: string;
    disabled: boolean;
    onSelect: () => void;
  };
  dataTestId?: string;
}

const PORTAL_MENU_MAX_HEIGHT = 384;

function DropdownComponent({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '',
  className = '',
  buttonClassName = '',
  searchable = false,
  showActionButtons = false,
  error = false,
  autoPosition = false,
  renderMenuInPortal = false,
  rightIcon,
  fieldLabel,
  fieldLabelIcon,
  fieldLabelTrailing,
  menuMaxHeight,
  menuSelectedStyle = 'background',
  menuExpandToContent = false,
  clearOption,
  dataTestId,
}: DropdownProps) {
  const { t } = useTranslation();
  const scrollIntoViewOnOpen = useContext(ScrollDropdownIntoViewContext);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [tempValue, setTempValue] = useState<string>(value);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [portalPosition, setPortalPosition] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollWaitFrameRef = useRef<number | null>(null);
  const openRequestIdRef = useRef(0);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && showActionButtons) {
      setTempValue(value);
    }
  }, [isOpen, value, showActionButtons]);

  useEffect(
    () => () => {
      if (scrollWaitFrameRef.current !== null) {
        cancelAnimationFrame(scrollWaitFrameRef.current);
      }
    },
    [],
  );

  const updatePortalPosition = useCallback(() => {
    if (!dropdownRef.current || !isOpen) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp =
      (autoPosition || renderMenuInPortal) &&
      spaceBelow < PORTAL_MENU_MAX_HEIGHT &&
      spaceAbove > spaceBelow;
    setPortalPosition({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp,
    });
    if (renderMenuInPortal) {
      setOpenUpwards(openUp);
      setIsPositioned(true);
    }
  }, [isOpen, autoPosition, renderMenuInPortal]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      setPortalPosition(null);
      return;
    }

    if (renderMenuInPortal) {
      updatePortalPosition();
      const scrollParent = dropdownRef.current?.closest('.overflow-y-auto, .overflow-auto');
      const removeResizeListener = addCoalescedResizeListener(updatePortalPosition);
      scrollParent?.addEventListener('scroll', updatePortalPosition, true);
      return () => {
        removeResizeListener();
        scrollParent?.removeEventListener('scroll', updatePortalPosition, true);
      };
    }

    if (autoPosition && dropdownRef.current && menuRef.current) {
      setIsPositioned(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!dropdownRef.current || !menuRef.current) return;

          const triggerRect = dropdownRef.current.getBoundingClientRect();
          const menuHeight = menuRef.current.offsetHeight;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - triggerRect.bottom;
          const spaceAbove = triggerRect.top;

          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            setOpenUpwards(true);
          } else {
            setOpenUpwards(false);
          }
          setIsPositioned(true);
        });
      });
    } else {
      setOpenUpwards(false);
      setIsPositioned(true);
    }
  }, [autoPosition, isOpen, options.length, renderMenuInPortal, updatePortalPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inMenu = renderMenuInPortal && menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      if (searchable && inputRef.current) {
        inputRef.current.focus();
      }

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, searchable, renderMenuInPortal]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );
  const displayText = useMemo(
    () => (selectedOption ? selectedOption.label : placeholder),
    [selectedOption, placeholder],
  );

  const optionsWithLower = useMemo(
    () => options.map((opt) => ({ ...opt, lowerLabel: opt.label.toLowerCase() })),
    [options],
  );
  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearchQuery) return optionsWithLower;
    const q = deferredSearchQuery.toLowerCase();
    return optionsWithLower.filter((opt) => opt.lowerLabel.includes(q));
  }, [optionsWithLower, searchable, deferredSearchQuery]);

  const RENDER_CHUNK = 50;
  const [visibleCount, setVisibleCount] = useState(RENDER_CHUNK);
  const optionsToRender =
    filteredOptions.length <= RENDER_CHUNK
      ? filteredOptions
      : filteredOptions.slice(0, visibleCount);

  useEffect(() => {
    if (!isOpen) {
      setVisibleCount(RENDER_CHUNK);
      return;
    }
    if (filteredOptions.length <= RENDER_CHUNK) return;
    const id = requestAnimationFrame(() => setVisibleCount(filteredOptions.length));
    return () => cancelAnimationFrame(id);
  }, [isOpen, filteredOptions.length]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (optionValue.startsWith('__category__')) {
        return;
      }
      if (showActionButtons) {
        setTempValue(optionValue);
      } else {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    [showActionButtons, onChange],
  );

  const openDropdown = useCallback(async () => {
    const requestId = openRequestIdRef.current + 1;
    openRequestIdRef.current = requestId;

    if (
      scrollIntoViewOnOpen &&
      typeof window !== 'undefined' &&
      window.innerWidth <= MOBILE_BREAKPOINT_PX &&
      dropdownRef.current
    ) {
      if (scrollWaitFrameRef.current !== null) {
        cancelAnimationFrame(scrollWaitFrameRef.current);
      }

      await smoothScrollTriggerBelowHeader(dropdownRef.current, (frameId) => {
        scrollWaitFrameRef.current = frameId;
      });

      if (openRequestIdRef.current !== requestId) {
        return;
      }

      setIsOpen(true);
      return;
    }

    setIsOpen(true);
  }, [scrollIntoViewOnOpen]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      if (!isOpen) void openDropdown();
    },
    [isOpen, openDropdown],
  );

  const handleInputFocus = useCallback(() => {
    if (disabled) return;
    if (isOpen) return;
    void openDropdown();
  }, [disabled, isOpen, openDropdown]);

  const handleToggleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      if (isOpen && showActionButtons) {
        onChange(tempValue);
        setSearchQuery('');
      }
      if (!isOpen) {
        void openDropdown();
        return;
      }
      setIsOpen(false);
    },
    [disabled, isOpen, showActionButtons, tempValue, onChange, openDropdown],
  );

  const handleReset = useCallback(() => {
    setTempValue('');
    onChange('');
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleConfirm = useCallback(() => {
    onChange(tempValue);
    setIsOpen(false);
    setSearchQuery('');
  }, [tempValue, onChange]);

  const clearOptionLabel = clearOption?.label;
  const clearOptionDisabled = clearOption?.disabled;
  const clearOptionSelect = clearOption?.onSelect;

  const resolvedClearOption = useMemo(() => {
    if (clearOptionLabel == null || clearOptionSelect == null) return undefined;
    return {
      label: clearOptionLabel,
      disabled: Boolean(clearOptionDisabled),
      onSelect: () => {
        clearOptionSelect();
        setIsOpen(false);
        setSearchQuery('');
      },
    };
  }, [clearOptionLabel, clearOptionDisabled, clearOptionSelect]);

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`} suppressHydrationWarning>
      <DropdownTrigger
        searchable={searchable}
        disabled={disabled}
        isOpen={isOpen}
        searchQuery={searchQuery}
        selectedOption={selectedOption}
        displayText={displayText}
        placeholder={placeholder}
        error={error}
        buttonClassName={buttonClassName}
        rightIcon={rightIcon}
        fieldLabel={fieldLabel}
        fieldLabelIcon={fieldLabelIcon}
        fieldLabelTrailing={fieldLabelTrailing}
        inputRef={inputRef}
        onInputChange={handleInputChange}
        onInputFocus={handleInputFocus}
        onToggle={handleToggleOpen}
        dataTestId={dataTestId}
      />
      {isOpen &&
        !disabled &&
        (renderMenuInPortal && portalPosition && typeof document !== 'undefined'
          ? createPortal(
              <DropdownMenu
                menuRef={menuRef}
                openUpwards={openUpwards}
                isPositioned={isPositioned}
                filteredOptions={optionsToRender}
                value={value}
                tempValue={tempValue}
                showActionButtons={showActionButtons}
                onSelect={handleSelect}
                onReset={handleReset}
                onConfirm={handleConfirm}
                t={t}
                menuSelectedStyle={menuSelectedStyle}
                menuExpandToContent={menuExpandToContent}
                clearOption={resolvedClearOption}
                dataTestId={dataTestId}
                portalStyle={{
                  position: 'fixed',
                  left: portalPosition.left,
                  ...(menuExpandToContent
                    ? { minWidth: portalPosition.width, width: 'max-content' }
                    : { width: portalPosition.width }),
                  ...(portalPosition.openUp
                    ? { bottom: window.innerHeight - portalPosition.top + 4 }
                    : { top: portalPosition.bottom + 4 }),
                  zIndex: 10050,
                }}
                menuMaxHeight={menuMaxHeight}
              />,
              document.body,
            )
          : !renderMenuInPortal && (
              <DropdownMenu
                menuRef={menuRef}
                openUpwards={openUpwards}
                isPositioned={isPositioned}
                filteredOptions={optionsToRender}
                value={value}
                tempValue={tempValue}
                showActionButtons={showActionButtons}
                onSelect={handleSelect}
                onReset={handleReset}
                onConfirm={handleConfirm}
                t={t}
                menuMaxHeight={menuMaxHeight}
                dataTestId={dataTestId}
                menuSelectedStyle={menuSelectedStyle}
                menuExpandToContent={menuExpandToContent}
                clearOption={resolvedClearOption}
              />
            ))}
    </div>
  );
}

export const Dropdown = React.memo(DropdownComponent);
export type { DropdownOption } from './dropdown-types';
