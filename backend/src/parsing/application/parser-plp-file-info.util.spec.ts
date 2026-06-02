import {
  ParserPlpFileInfo,
  buildPlpFileInfoFromContent,
  sortPlpFileInfoList,
} from './parser-plp-file-info.util';

describe('buildPlpFileInfoFromContent', () => {
  it('returns defaults when content is null', () => {
    const info = buildPlpFileInfoFromContent(
      'cipauto',
      'CipAuto',
      'default.json',
      'default',
      null,
      0,
    );
    expect(info).toMatchObject({
      parserCode: 'cipauto',
      parserLabel: 'CipAuto',
      fileName: 'default.json',
      fileKey: 'default',
      label: 'default.json',
      lastUpdatedAt: null,
      itemsCount: 0,
      errorItemsCount: 0,
      missingCandidatesCount: 0,
      fileSizeBytes: 0,
    });
  });

  it('parses login, meta counts and error items', () => {
    const content = JSON.stringify({
      login: 'dealer1',
      meta: { lastUpdatedAt: '2026-02-01T00:00:00.000Z', missingCandidatesCount: 2 },
      items: {
        a: { error: 'boom' },
        b: { ok: true },
        c: { error: '   ' },
      },
    });

    const info = buildPlpFileInfoFromContent(
      '999md',
      '999.md',
      'dealer1.json',
      'dealer1.json',
      content,
      1234,
    );

    expect(info.label).toBe('dealer1 (dealer1.json)');
    expect(info.lastUpdatedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(info.itemsCount).toBe(3);
    expect(info.errorItemsCount).toBe(1);
    expect(info.missingCandidatesCount).toBe(2);
    expect(info.fileSizeBytes).toBe(1234);
  });

  it('prefers meta.activeItemsCount over item list length', () => {
    const content = JSON.stringify({
      meta: { activeItemsCount: 10 },
      items: { a: {}, b: {} },
    });
    const info = buildPlpFileInfoFromContent('cipauto', 'CipAuto', 'f.json', 'default', content, 0);
    expect(info.itemsCount).toBe(10);
  });

  it('falls back to filename label on malformed JSON', () => {
    const info = buildPlpFileInfoFromContent('cipauto', 'CipAuto', 'f.json', 'default', '{bad', 5);
    expect(info.label).toBe('f.json');
    expect(info.fileSizeBytes).toBe(5);
  });
});

describe('sortPlpFileInfoList', () => {
  const base: Omit<ParserPlpFileInfo, 'fileName' | 'parserLabel' | 'lastUpdatedAt'> = {
    parserCode: 'p',
    fileKey: 'k',
    label: 'l',
    itemsCount: 0,
    errorItemsCount: 0,
    missingCandidatesCount: 0,
    fileSizeBytes: 0,
  };

  it('sorts by lastUpdatedAt desc, then parserLabel, then fileName', () => {
    const list: ParserPlpFileInfo[] = [
      { ...base, fileName: 'b.json', parserLabel: 'B', lastUpdatedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, fileName: 'a.json', parserLabel: 'A', lastUpdatedAt: '2026-03-01T00:00:00.000Z' },
      { ...base, fileName: 'a.json', parserLabel: 'A', lastUpdatedAt: null },
    ];

    const sorted = sortPlpFileInfoList([...list]);

    expect(sorted[0].lastUpdatedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(sorted[1].lastUpdatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(sorted[2].lastUpdatedAt).toBeNull();
  });
});
