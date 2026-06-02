'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { HintTooltip } from '@/ui';

type ParsingCheckboxLabelWithHintProps = {
  labelKey: string;
  hintKey: string;
  hintAriaKey: string;
};

export function ParsingCheckboxLabelWithHint({
  labelKey,
  hintKey,
  hintAriaKey,
}: ParsingCheckboxLabelWithHintProps) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{t(labelKey)}</span>
      <HintTooltip ariaLabel={t(hintAriaKey)}>{t(hintKey)}</HintTooltip>
    </span>
  );
}
