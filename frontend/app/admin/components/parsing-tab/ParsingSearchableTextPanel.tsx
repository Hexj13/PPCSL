'use client';

import { useCallback } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { toast } from '@/lib/toast';

import { AdminActionButton } from '../AdminButtons';

import { modalInputClassName, modalPrimaryButtonClassName } from './parsing-tab-constants';
import { getSearchMatchCount, renderHighlightedText } from './parsing-tab-utils';

type ParsingSearchableTextPanelProps = {
  content: string;
  query: string;
  onQueryChange: (_value: string) => void;
  copyLabel: string;
};

export function ParsingSearchableTextPanel({
  content,
  query,
  onQueryChange,
  copyLabel,
}: ParsingSearchableTextPanelProps) {
  const { t } = useTranslation();
  const trimmedQuery = query.trim();
  const matchCount = getSearchMatchCount(content, trimmedQuery);

  const copyModalText = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.parsing.copySuccess', { label }));
      } catch {
        toast.error(t('admin.parsing.copyError'));
      }
    },
    [t],
  );

  return (
    <>
      <div className="mb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
          <AdminActionButton
            className={modalPrimaryButtonClassName}
            onClick={() => void copyModalText(content, copyLabel)}
          >
            {t('admin.parsing.copy')}
          </AdminActionButton>
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('admin.parsing.searchPlaceholder')}
              className={modalInputClassName}
            />
          </div>
        </div>
        <div className="sm:flex sm:justify-end">
          <p className="mt-1 text-xs text-text-secondary sm:text-right">
            {t('admin.parsing.searchMatches', { count: trimmedQuery ? matchCount : '—' })}
          </p>
        </div>
      </div>
      <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto bg-primary-500/5 p-3 rounded-lg border border-primary-500/15">
        {renderHighlightedText(content, trimmedQuery)}
      </pre>
    </>
  );
}

export function useParsingSearchableTextCopy() {
  const { t } = useTranslation();

  return useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.parsing.copySuccess', { label }));
      } catch {
        toast.error(t('admin.parsing.copyError'));
      }
    },
    [t],
  );
}
