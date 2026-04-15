'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/modals/Modal';
import { formatAdminTableDateTime } from '@/lib/utils';

import { AdminActionButton } from './AdminButtons';

export const adminSearchInputClassName =
  'w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-secondary border-2 border-primary-700 text-text-primary placeholder:text-text-secondary focus:outline-hidden focus:border-primary-900 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base';
export const adminTableHeaderClassName = 'py-3 px-4 text-sm font-semibold text-primary-900';
export const adminTableCellClassName = 'py-3 px-4 text-sm';
export const adminTableCenteredCellClassName = `${adminTableCellClassName} text-center`;
export const adminTableCenteredSecondaryCellClassName = `${adminTableCenteredCellClassName} text-text-secondary`;
export const adminTablePrimaryButtonClassName = 'h-auto px-3 py-1.5 text-sm';

export type ActionMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  withTopDivider?: boolean;
};

interface AdminSearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> {
  className?: string;
}

interface AdminTableStateProps {
  loading: boolean;
  isEmpty: boolean;
  loadingText: string;
  emptyText: string;
  emptyClassName?: string;
  children: ReactNode;
}

interface AdminCopyValueCellProps {
  value: string;
  label: string;
  short?: boolean;
}

interface AdminActionsMenuPortalProps {
  isOpen: boolean;
  top: number;
  left: number;
  menuDataAttr: string;
  items: ActionMenuItem[];
}

interface AdminConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminSearchInput({ className, ...props }: AdminSearchInputProps) {
  return <input type="text" className={className ?? adminSearchInputClassName} {...props} />;
}

export function AdminTableState({
  loading,
  isEmpty,
  loadingText,
  emptyText,
  emptyClassName,
  children,
}: AdminTableStateProps) {
  if (loading) {
    return <div className="py-8 text-center text-text-secondary">{loadingText}</div>;
  }
  if (isEmpty) {
    return <EmptyState message={emptyText} className={emptyClassName ?? 'py-10 md:py-12'} />;
  }
  return <>{children}</>;
}

function formatShortId(value: string): string {
  if (value.length <= 8) {
    return value;
  }
  return `${value.slice(0, 8)}...`;
}

export function AdminCopyValueCell({ value, label, short = false }: AdminCopyValueCellProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="hidden md:inline text-text-secondary font-mono text-xs break-all">
        {short ? formatShortId(value) : value}
      </span>
      <CopyButton text={value} label={label} />
    </div>
  );
}

export function AdminDateTimeCell({ value }: { value: string | null | undefined }) {
  return (
    <td className={`${adminTableCenteredSecondaryCellClassName} whitespace-nowrap`}>
      {formatAdminTableDateTime(value)}
    </td>
  );
}

export function AdminActionsMenuPortal({
  isOpen,
  top,
  left,
  menuDataAttr,
  items,
}: AdminActionsMenuPortalProps) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      data-admin-actions-menu
      {...{ [menuDataAttr]: true }}
      role="menu"
      className="fixed z-[120] min-w-48 rounded-lg border-2 border-primary-500/30 bg-white shadow-xl"
      style={{ top, left, transform: 'translateX(-100%)' }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={[
            'w-full px-4 py-3 text-left text-sm transition-colors duration-150',
            item.danger
              ? 'text-red-700 hover-only:hover:bg-red-50'
              : 'text-text-primary hover-only:hover:bg-primary-500/10',
            item.withTopDivider ? 'border-t border-primary-500/20' : '',
            item.disabled ? 'cursor-not-allowed opacity-50' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={item.onSelect}
        >
          <span className="inline-flex items-center gap-2">
            {item.icon ?? null}
            <span>{item.label}</span>
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

export function AdminConfirmModal({
  isOpen,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'danger',
  onClose,
  onConfirm,
}: AdminConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <p className="text-text-secondary mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <AdminActionButton variant="secondary" onClick={onClose}>
          {cancelLabel}
        </AdminActionButton>
        <AdminActionButton variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </AdminActionButton>
      </div>
    </Modal>
  );
}
