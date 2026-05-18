'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { localizedHref } from '@/lib/localized-href';

export { localizedHref } from '@/lib/localized-href';

type NavigateOptions = NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;

export function useLocalizedNavigation() {
  const { locale } = useI18n();
  const router = useRouter();

  const href = useCallback(
    (restPathWithOptionalQuery: string) => localizedHref(restPathWithOptionalQuery, locale),
    [locale],
  );

  const push = useCallback(
    (restPathWithOptionalQuery: string, options?: NavigateOptions) => {
      router.push(href(restPathWithOptionalQuery), options);
    },
    [href, router],
  );

  const replace = useCallback(
    (restPathWithOptionalQuery: string, options?: NavigateOptions) => {
      router.replace(href(restPathWithOptionalQuery), options);
    },
    [href, router],
  );

  return useMemo(() => ({ locale, href, push, replace }), [locale, href, push, replace]);
}
