import type { Metadata } from 'next';

/** When NEXT_PUBLIC_NOINDEX=true, force noindex/nofollow for staging/pre-launch. */
export function isSiteNoindex(): boolean {
  return process.env.NEXT_PUBLIC_NOINDEX === 'true';
}

export function buildSiteRobotsMetadata(options?: {
  index?: boolean;
  follow?: boolean;
  googleBotExtra?: Record<string, string | number | boolean>;
}): NonNullable<Metadata['robots']> {
  const noindex = isSiteNoindex();
  const index = noindex ? false : (options?.index ?? true);
  const follow = noindex ? false : (options?.follow ?? true);
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      ...(options?.googleBotExtra ?? {}),
    },
  };
}
