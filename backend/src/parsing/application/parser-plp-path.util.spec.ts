import {
  normalizeSyncPlpFileKey,
  resolveS3RelativePath,
  toLoginFileSlug,
} from './parser-plp-path.util';

describe('toLoginFileSlug', () => {
  it('lowercases and replaces non-slug chars with dashes', () => {
    expect(toLoginFileSlug('Dealer Auto!')).toBe('dealer-auto-');
    expect(toLoginFileSlug('  ABC_def-1 ')).toBe('abc_def-1');
  });

  it('returns a fallback for empty input', () => {
    expect(toLoginFileSlug('   ')).toBe('unknown-login');
  });
});

describe('normalizeSyncPlpFileKey', () => {
  it('returns the basename and appends .json when missing', () => {
    expect(normalizeSyncPlpFileKey('dealer1')).toBe('dealer1.json');
    expect(normalizeSyncPlpFileKey('a/b/dealer1.json')).toBe('dealer1.json');
    expect(normalizeSyncPlpFileKey('  default.json ')).toBe('default.json');
  });
});

describe('resolveS3RelativePath', () => {
  it('maps 999md keys into the current-plp folder', () => {
    expect(resolveS3RelativePath('999md', 'default')).toBe('999md/current-plp/default.json');
    expect(resolveS3RelativePath('999md', 'a/b/dealer1.json')).toBe(
      '999md/current-plp/dealer1.json',
    );
  });

  it('falls back to parserCode/fileKey for unknown parsers', () => {
    expect(resolveS3RelativePath('unknown-parser', 'foo')).toBe('unknown-parser/foo.json');
  });
});
