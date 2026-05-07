import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it } from '@jest/globals';

import { loadSourceIdsFromPlpFile } from './load-plp-source-ids';

describe('loadSourceIdsFromPlpFile', () => {
  it('returns keys from items object', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plp-src-'));
    const file = path.join(dir, 'plp.json');
    fs.writeFileSync(file, JSON.stringify({ items: { a: {}, b: {} } }));
    const ids = loadSourceIdsFromPlpFile(file);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('throws when file is missing', () => {
    expect(() => loadSourceIdsFromPlpFile(path.join(os.tmpdir(), 'missing-plp-xyz.json'))).toThrow(
      /PLP file not found/,
    );
  });
});
