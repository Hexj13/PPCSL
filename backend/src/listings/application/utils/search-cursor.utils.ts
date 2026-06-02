export interface SearchCursorPayload {
  promoted: 0 | 1;
  sortValue: string | number;
  id: string;
}

export function encodeSearchCursor(payload: SearchCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeSearchCursor(cursor: string): SearchCursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as SearchCursorPayload;
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      (parsed.promoted !== 0 && parsed.promoted !== 1) ||
      (typeof parsed.sortValue !== 'string' && typeof parsed.sortValue !== 'number')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
