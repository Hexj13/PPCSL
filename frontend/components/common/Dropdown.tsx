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
import { Button } from '@/ui';

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

interface DropdownOption {
  value: string;
  label: string;
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
  menuMaxHeight?: number;
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
  menuMaxHeight,
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
      window.addEventListener('resize', updatePortalPosition);
      scrollParent?.addEventListener('scroll', updatePortalPosition, true);
      return () => {
        window.removeEventListener('resize', updatePortalPosition);
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
        inputRef={inputRef}
        onInputChange={handleInputChange}
        onInputFocus={handleInputFocus}
        onToggle={handleToggleOpen}
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
                portalStyle={{
                  position: 'fixed',
                  left: portalPosition.left,
                  width: portalPosition.width,
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
              />
            ))}
    </div>
  );
}

interface DropdownTriggerProps {
  searchable: boolean;
  disabled: boolean;
  isOpen: boolean;
  searchQuery: string;
  selectedOption: DropdownOption | null;
  displayText: string;
  placeholder: string;
  error: boolean;
  buttonClassName: string;
  rightIcon?: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onToggle: (e: React.MouseEvent) => void;
}

function DropdownTrigger({
  searchable,
  disabled,
  isOpen,
  searchQuery,
  selectedOption,
  displayText,
  placeholder,
  error,
  buttonClassName,
  rightIcon,
  inputRef,
  onInputChange,
  onInputFocus,
  onToggle,
}: DropdownTriggerProps) {
  if (searchable) {
    return (
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : selectedOption ? displayText : ''}
          onChange={onInputChange}
          onFocus={onInputFocus}
          disabled={disabled}
          placeholder={isOpen ? '' : placeholder}
          className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${selectedOption ? 'text-text-primary' : ''}`}
          style={{ paddingRight: '52px', color: selectedOption ? undefined : '#9ca3af' }}
        />
        <DropdownChevron isOpen={isOpen} onClick={onToggle} />
      </div>
    );
  }
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      disabled={disabled ? true : undefined}
      className={`input-field dropdown-button text-left cursor-pointer relative flex items-center group ${rightIcon ? 'gap-1 md:gap-1.5' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${buttonClassName || ''}`}
      style={{ paddingRight: '52px' }}
      suppressHydrationWarning
    >
      {rightIcon && (
        <span className="shrink-0" suppressHydrationWarning>
          {rightIcon}
        </span>
      )}
      <span
        className="flex-1 truncate min-w-0 text-text-primary"
        style={!selectedOption ? { color: '#9ca3af' } : undefined}
        suppressHydrationWarning
      >
        {displayText}
      </span>
      <DropdownChevron
        isOpen={isOpen}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 shrink-0 pointer-events-none"
        style={{ right: '16px' }}
      />
    </button>
  );
}

interface DropdownMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  openUpwards: boolean;
  isPositioned: boolean;
  filteredOptions: DropdownOption[];
  value: string;
  tempValue: string;
  showActionButtons: boolean;
  onSelect: (_value: string) => void;
  onReset: () => void;
  onConfirm: () => void;
  t: (_key: string) => string;
  portalStyle?: React.CSSProperties;
  menuMaxHeight?: number;
}

function DropdownMenu({
  menuRef,
  openUpwards,
  isPositioned,
  filteredOptions,
  value,
  tempValue,
  showActionButtons,
  onSelect,
  onReset,
  onConfirm,
  t,
  portalStyle,
  menuMaxHeight,
}: DropdownMenuProps) {
  const isPortaled = !!portalStyle;
  const scrollStyle = menuMaxHeight != null ? { maxHeight: menuMaxHeight } : undefined;
  const scrollClass =
    menuMaxHeight != null
      ? 'overflow-auto scrollbar-custom'
      : 'max-h-96 overflow-auto scrollbar-custom';
  return (
    <div
      ref={menuRef}
      className={`bg-white border-2 border-primary-500/30 rounded-lg shadow-xl ${
        isPortaled
          ? ''
          : `absolute z-100 w-full ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}`
      } ${!isPositioned ? 'opacity-0 pointer-events-none' : ''}`}
      style={portalStyle}
    >
      <div className={scrollClass} style={scrollStyle}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const isSelected = showActionButtons
              ? option.value === tempValue
              : option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`w-full px-4 py-3 text-left text-sm text-text-primary hover-only:hover:bg-primary-500/10 transition-colors duration-150 flex items-center justify-between ${
                  isSelected ? 'bg-primary-500/20 font-semibold' : ''
                }`}
              >
                <span>{option.label}</span>
              </button>
            );
          })
        ) : (
          <div className="px-4 py-3 text-text-secondary text-center">
            {t('searchFilters.noResults')}
          </div>
        )}
      </div>
      {showActionButtons && (
        <div className="border-t border-divider px-2 py-1.5 flex justify-end gap-1.5 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-sm text-text-primary hover-only:hover:text-primary-500 transition-colors duration-150"
          >
            {t('common.reset')}
          </button>
          <Button variant="primary" size="xs" onClick={onConfirm}>
            {t('common.ok')}
          </Button>
        </div>
      )}
    </div>
  );
}

function DropdownChevron({
  isOpen,
  onClick,
  className = '',
  style,
}: {
  isOpen: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const baseClass = 'w-5 h-5 text-primary-900 transition-colors duration-200';
  const positioned = onClick ? 'cursor-pointer group-hover:text-primary-700' : '';
  const rotate = isOpen ? 'rotate-180' : '';
  return (
    <svg
      className={`absolute top-1/2 transform -translate-y-1/2 ${baseClass} ${positioned} ${rotate} ${className}`}
      style={onClick ? { right: '16px' } : style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      onClick={onClick}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export const Dropdown = React.memo(DropdownComponent);
