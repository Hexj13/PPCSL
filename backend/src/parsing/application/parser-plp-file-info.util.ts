export interface ParserPlpFileOption {
  key: string;
  fileName: string;
  label: string;
  updatedAt: string | null;
  itemsCount: number | null;
}

export interface ParserPlpFileInfo {
  parserCode: string;
  parserLabel: string;
  fileName: string;
  fileKey: string;
  label: string;
  lastUpdatedAt: string | null;
  itemsCount: number;
  errorItemsCount: number;
  missingCandidatesCount: number;
  fileSizeBytes: number;
}

export function buildPlpFileInfoFromContent(
  parserCode: string,
  parserLabel: string,
  fileName: string,
  fileKey: string,
  content: string | null,
  fileSizeBytes: number,
): ParserPlpFileInfo {
  let label = fileName;
  let lastUpdatedAt: string | null = null;
  let itemsCount = 0;
  let errorItemsCount = 0;
  let missingCandidatesCount = 0;

  if (content) {
    try {
      const parsed = JSON.parse(content) as {
        login?: unknown;
        items?: Record<string, unknown>;
        meta?: Record<string, unknown>;
      };
      const meta = parsed.meta ?? {};
      const login = typeof parsed.login === 'string' ? parsed.login.trim() : '';
      if (login.length > 0) {
        label = `${login} (${fileName})`;
      }
      if (typeof meta.lastUpdatedAt === 'string' && meta.lastUpdatedAt.trim().length > 0) {
        lastUpdatedAt = meta.lastUpdatedAt;
      }
      const rawItems = parsed.items && typeof parsed.items === 'object' ? parsed.items : {};
      const itemList = Object.values(rawItems);
      const metaItemsCount =
        typeof meta.activeItemsCount === 'number'
          ? Number(meta.activeItemsCount)
          : typeof meta.totalItems === 'number'
            ? Number(meta.totalItems)
            : null;
      itemsCount = metaItemsCount ?? itemList.length;
      if (typeof meta.errorItemsCount === 'number') {
        errorItemsCount = Number(meta.errorItemsCount);
      } else {
        errorItemsCount = itemList.filter((item) => {
          if (!item || typeof item !== 'object') {
            return false;
          }
          const errorValue = (item as { error?: unknown }).error;
          return typeof errorValue === 'string' && errorValue.trim().length > 0;
        }).length;
      }
      missingCandidatesCount =
        typeof meta.missingCandidatesCount === 'number' ? Number(meta.missingCandidatesCount) : 0;
    } catch {
      label = fileName;
    }
  }

  return {
    parserCode,
    parserLabel,
    fileName,
    fileKey,
    label,
    lastUpdatedAt,
    itemsCount,
    errorItemsCount,
    missingCandidatesCount,
    fileSizeBytes,
  };
}

export function sortPlpFileInfoList(list: ParserPlpFileInfo[]): ParserPlpFileInfo[] {
  return list.sort((a, b) => {
    const left = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
    const right = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
    if (right !== left) {
      return right - left;
    }
    if (a.parserLabel !== b.parserLabel) {
      return a.parserLabel.localeCompare(b.parserLabel);
    }
    return a.fileName.localeCompare(b.fileName);
  });
}
