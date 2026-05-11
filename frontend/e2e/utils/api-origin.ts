function trimUrl(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t?.length ? t : undefined;
}

function firstAbsoluteHttpOrigin(candidates: Array<string | undefined>): string | undefined {
  for (const c of candidates) {
    const v = trimUrl(c);
    if (v && (v.startsWith('http://') || v.startsWith('https://'))) {
      return v.replace(/\/$/, '');
    }
  }
  return undefined;
}

export function getE2eBackendApiOrigin(): string {
  const fromEnv = firstAbsoluteHttpOrigin([
    process.env.E2E_API_URL,
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]);
  if (fromEnv) {
    return fromEnv;
  }
  return 'http://localhost:4000';
}

export function getE2eAppOrigin(): string {
  const fromEnv = firstAbsoluteHttpOrigin([
    process.env.E2E_BASE_URL,
    process.env.PLAYWRIGHT_BASE_URL,
  ]);
  if (fromEnv) {
    return fromEnv;
  }
  return 'http://localhost:3000';
}
