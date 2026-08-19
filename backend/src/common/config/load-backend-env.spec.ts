import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadBackendEnvFile } from './load-backend-env';

describe('loadBackendEnvFile', () => {
  const key = 'PPCSL_TEST_ENV_LOAD_KEY';
  let tmp: string | undefined;

  afterEach(() => {
    delete process.env[key];
    if (tmp && fs.existsSync(tmp)) {
      fs.unlinkSync(tmp);
    }
    tmp = undefined;
  });

  it('is a no-op when the file is missing', () => {
    expect(() => loadBackendEnvFile(path.join(os.tmpdir(), 'ppcsl-missing.env'))).not.toThrow();
  });

  it('sets unset variables from the file', () => {
    tmp = path.join(os.tmpdir(), `ppcsl-env-load-${process.pid}.env`);
    fs.writeFileSync(tmp, `${key}=from-file\n`);
    delete process.env[key];
    loadBackendEnvFile(tmp);
    expect(process.env[key]).toBe('from-file');
  });

  it('does not override variables already in the process environment', () => {
    tmp = path.join(os.tmpdir(), `ppcsl-env-keep-${process.pid}.env`);
    fs.writeFileSync(tmp, `${key}=from-file\n`);
    process.env[key] = 'already';
    loadBackendEnvFile(tmp);
    expect(process.env[key]).toBe('already');
  });
});
