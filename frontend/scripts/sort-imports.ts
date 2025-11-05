import * as fs from 'fs';
import * as path from 'path';

interface ImportBlock {
  lines: string[];
  type: 'all' | 'multiple' | 'single' | 'type';
  modulePath: string;
  originalIndex: number;
}

function parseFile(content: string): { imports: ImportBlock[]; rest: string } {
  const lines = content.split('\n');
  const imports: ImportBlock[] = [];
  const restLines: string[] = [];
  let currentImport: string[] = [];
  let inImport = false;
  let importIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('import ') || trimmed.startsWith('import type ')) {
      if (currentImport.length > 0) {
        const block = parseImportBlock(currentImport);
        if (block) {
          block.originalIndex = importIndex++;
          imports.push(block);
        }
        currentImport = [];
      }
      currentImport.push(line);
      inImport = true;
    } else if (
      inImport &&
      (trimmed === '' || trimmed.startsWith('//') || trimmed.includes('from'))
    ) {
      currentImport.push(line);
      if (trimmed.includes(';')) {
        const block = parseImportBlock(currentImport);
        if (block) {
          block.originalIndex = importIndex++;
          imports.push(block);
        }
        currentImport = [];
        inImport = false;
      }
    } else {
      if (currentImport.length > 0) {
        const block = parseImportBlock(currentImport);
        if (block) {
          block.originalIndex = importIndex++;
          imports.push(block);
        }
        currentImport = [];
      }
      inImport = false;
      restLines.push(line);
    }
  }

  if (currentImport.length > 0) {
    const block = parseImportBlock(currentImport);
    if (block) {
      block.originalIndex = importIndex++;
      imports.push(block);
    }
  }

  return { imports, rest: restLines.join('\n') };
}

function parseImportBlock(lines: string[]): ImportBlock | null {
  const fullText = lines.join('\n');
  const trimmed = fullText.trim();

  if (!trimmed.startsWith('import')) return null;

  const isTypeImport = trimmed.startsWith('import type ');
  const fromMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
  if (!fromMatch) return null;

  const modulePath = fromMatch[1];
  let type: 'all' | 'multiple' | 'single' | 'type' = 'single';

  if (trimmed.includes('import * as')) {
    type = 'all';
  } else if (trimmed.includes('{')) {
    type = 'multiple';
  } else if (isTypeImport) {
    type = 'type';
  }

  return {
    lines,
    type,
    modulePath,
    originalIndex: 0,
  };
}

function sortImports(imports: ImportBlock[]): ImportBlock[] {
  const typeOrder: Record<string, number> = { all: 0, multiple: 1, single: 2, type: 3 };

  return imports.sort((a, b) => {
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    if (a.modulePath < b.modulePath) return -1;
    if (a.modulePath > b.modulePath) return 1;
    return 0;
  });
}

function sortImportsInFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { imports, rest } = parseFile(content);

    if (imports.length === 0) return false;

    const sortedImports = sortImports(imports);
    const sortedImportText = sortedImports.map((imp) => imp.lines.join('\n')).join('\n');

    const allLines = content.split('\n');
    const firstImportIndex = allLines.findIndex((l) => l.trim().startsWith('import'));
    const beforeImports =
      firstImportIndex > 0 ? allLines.slice(0, firstImportIndex).join('\n') : '';
    const newContent = beforeImports + (beforeImports ? '\n' : '') + sortedImportText + '\n' + rest;

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== 'dist' &&
        file !== 'scripts' &&
        file !== '.next' &&
        file !== 'out'
      ) {
        findTsFiles(filePath, fileList);
      } else if (
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.test.ts')
      ) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return fileList;
}

const targetDir = process.argv[2] || path.join(__dirname, '..');
const files = findTsFiles(targetDir);

console.log(`Found ${files.length} TypeScript files\n`);
let changed = 0;

files.forEach((file) => {
  if (sortImportsInFile(file)) {
    changed++;
    console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\n✅ Fixed ${changed} files`);
