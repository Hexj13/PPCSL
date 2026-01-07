import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface Translations {
  [key: string]: string | Translations;
}

interface TranslationFile {
  locale: string;
  path: string;
  translations: Translations;
}

function getAllKeys(obj: Translations, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Translations, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueByPath(obj: Translations, path: string): string | Translations | undefined {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function loadTranslations(filePath: string): Translations {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading translations from ${filePath}:`, error);
    return {};
  }
}

function findLocaleFiles(dir: string): TranslationFile[] {
  const files: TranslationFile[] = [];
  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const locale = entry.name.replace('.json', '');
        const filePath = join(dir, entry.name);
        const translations = loadTranslations(filePath);
        if (Object.keys(translations).length > 0) {
          files.push({
            locale,
            path: filePath,
            translations,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}:`, error);
  }

  return files;
}

function checkTranslationsSync() {
  const localesDir = join(process.cwd(), 'lib', 'locales');
  const rootLocalesDir = join(process.cwd(), '..', '..', 'locales');

  const frontendFiles = findLocaleFiles(localesDir);
  const rootFiles = findLocaleFiles(rootLocalesDir);

  const allFiles: TranslationFile[] = [...frontendFiles, ...rootFiles];

  if (allFiles.length === 0) {
    console.error('❌ No translation files found!');
    return 1;
  }

  const locales = Array.from(new Set(allFiles.map((f) => f.locale)));
  console.log(`Found ${locales.length} locale(s): ${locales.join(', ')}`);

  const allKeys = new Set<string>();
  for (const file of allFiles) {
    const keys = getAllKeys(file.translations);
    keys.forEach((key) => allKeys.add(key));
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of Array.from(allKeys)) {
    const missingInLocales: Array<{ locale: string; filePath: string }> = [];
    const presentInLocales: string[] = [];

    for (const locale of locales) {
      const files = allFiles.filter((f) => f.locale === locale);
      const frontendFile = files.find((f) => f.path.startsWith(localesDir));
      const rootFile = files.find((f) => f.path.startsWith(rootLocalesDir));

      let found = false;
      let filePath = '';

      if (frontendFile) {
        const value = getValueByPath(frontendFile.translations, key);
        if (value !== undefined) {
          found = true;
        } else {
          filePath = frontendFile.path;
        }
      }

      if (!found && rootFile) {
        const value = getValueByPath(rootFile.translations, key);
        if (value !== undefined) {
          found = true;
        } else if (!filePath) {
          filePath = rootFile.path;
        }
      }

      if (found) {
        presentInLocales.push(locale);
      } else {
        const targetFile = frontendFile || rootFile;
        missingInLocales.push({
          locale,
          filePath: filePath || (targetFile ? targetFile.path : `${locale}.json`),
        });
      }
    }

    if (missingInLocales.length > 0 && presentInLocales.length > 0) {
      for (const { filePath } of missingInLocales) {
        const relativePath = filePath.replace(process.cwd() + '/', '');
        errors.push(`Missing key "${key}" in ${relativePath}`);
      }
    }

    if (presentInLocales.length === 0) {
      warnings.push(`Key "${key}" not found in any locale file`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Translation sync errors found:');
    errors.forEach((error) => console.error(`  - ${error}`));
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Translation sync warnings:');
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`✅ All translation keys are synchronized! (${allKeys.size} keys checked)`);
    return 0;
  }

  if (errors.length > 0) {
    console.error(`\nFound ${errors.length} error(s) and ${warnings.length} warning(s).`);
    console.error('\nPlease add missing translation keys to all locale files.');
    return 1;
  }

  return 0;
}

const exitCode = checkTranslationsSync();
process.exit(exitCode);
