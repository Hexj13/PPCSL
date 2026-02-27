'use client';

import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { CopyIcon } from '@/ui';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconClassName?: string;
  title?: string;
  successMessageKey?: string;
  errorMessageKey?: string;
}

export function CopyButton({
  text,
  label = 'ID',
  className = '',
  iconClassName = 'w-3.5 h-3.5 md:w-4 md:h-4',
  title,
  successMessageKey = 'admin.listingsTab.copySuccess',
  errorMessageKey = 'admin.listingsTab.copyError',
}: CopyButtonProps) {
  const { t } = useTranslation();

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        if (label) {
          toast.success(t(successMessageKey, { label }));
        } else {
          toast.success(t(successMessageKey));
        }
      } catch {
        toast.error(t(errorMessageKey));
      }
    },
    [text, label, t, successMessageKey, errorMessageKey],
  );

  return (
    <button
      onClick={handleCopy}
      className={`p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0 ${className}`}
      title={title || t('common.copyId')}
    >
      <CopyIcon className={iconClassName} />
    </button>
  );
}
