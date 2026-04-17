import { stripAnsiSequences } from './strip-ansi-sequences';

describe('stripAnsiSequences', () => {
  it('removes CSI color codes used by TypeORM log output', () => {
    const raw = '\u001b[90m\u001b[4mquery:\u001b[24m\u001b[39m \u001b[94mSELECT\u001b[0m 1';
    expect(stripAnsiSequences(raw)).toBe('query: SELECT 1');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsiSequences('[IMPORT] ok')).toBe('[IMPORT] ok');
  });
});
