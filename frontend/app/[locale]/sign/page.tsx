import { sanitizeReturnUrl } from '@/lib/return-url';

import { SignPageContent, type AuthTab } from './SignPageContent';

type SignSearchParams = {
  tab?: string | string[];
  returnUrl?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignPage({
  searchParams,
}: {
  searchParams: Promise<SignSearchParams>;
}) {
  const params = await searchParams;
  const tab: AuthTab = firstSearchParam(params.tab) === 'register' ? 'register' : 'login';
  const returnUrl = sanitizeReturnUrl(firstSearchParam(params.returnUrl) ?? null);

  return <SignPageContent tab={tab} returnUrl={returnUrl} />;
}
