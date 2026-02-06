export function cleanStringField(value: string | null | undefined): string | null {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return value.trim();
}

export function cleanUserData<T extends Record<string, unknown>>(data: T): T {
  const cleaned = { ...data } as T & {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    companyName?: string | null;
    companyWebsiteUrl?: string | null;
  };

  if ('firstName' in cleaned) {
    cleaned.firstName = cleanStringField(cleaned.firstName as string | null);
  }
  if ('lastName' in cleaned) {
    cleaned.lastName = cleanStringField(cleaned.lastName as string | null);
  }
  if ('email' in cleaned) {
    cleaned.email = cleanStringField(cleaned.email as string | null);
  }
  if ('companyName' in cleaned) {
    cleaned.companyName = cleanStringField(cleaned.companyName as string | null);
  }
  if ('companyWebsiteUrl' in cleaned) {
    cleaned.companyWebsiteUrl = cleanStringField(cleaned.companyWebsiteUrl as string | null);
  }

  return cleaned as T;
}
