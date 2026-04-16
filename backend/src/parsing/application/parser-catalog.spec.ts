import * as fs from 'fs';
import * as path from 'path';

import { parsersConfig } from '../../common/config/parsers';
import { getParserCatalog, getParserCatalogItem } from './parser-catalog';

describe('parser-catalog', () => {
  it('exposes one catalog entry per configured parser', () => {
    const catalog = getParserCatalog();
    expect(catalog).toHaveLength(parsersConfig.length);
    expect(catalog.map((item) => item.code).sort()).toEqual(
      parsersConfig.map((item) => item.code).sort(),
    );
  });

  it('has a catalog entry for every declared parser code', () => {
    for (const parser of parsersConfig) {
      const item = getParserCatalogItem(parser.code);
      expect(item).toBeDefined();
      expect(item?.code).toBe(parser.code);
    }
  });

  describe('cliScript resolution', () => {
    const toolsDir = path.join(__dirname, '..', '..', 'scripts', 'tools');

    it.each(parsersConfig.map((p) => [p.code, p.cliScript] as const))(
      '%s points to an existing CLI source file (%s)',
      (_code, cliScript) => {
        expect(cliScript).toMatch(/\.ts$/);
        const cliTsPath = path.join(toolsDir, cliScript);
        expect(fs.existsSync(cliTsPath)).toBe(true);
      },
    );
  });

  describe('release flags', () => {
    it('released parsers must be runnable somewhere (manual or scheduler)', () => {
      const released = parsersConfig.filter((p) => p.releaseStage === 'released');
      for (const parser of released) {
        const isReachable =
          parser.manualRunEnabled || parser.schedulerEnabled || parser.isVisibleInAdmin;
        expect(isReachable).toBe(true);
      }
    });

    it('hidden parsers are not visible in admin', () => {
      const hidden = parsersConfig.filter((p) => p.adminAvailability === 'hidden');
      for (const parser of hidden) {
        expect(parser.isVisibleInAdmin).toBe(false);
      }
    });
  });
});
