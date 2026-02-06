import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'scripts' && file !== 'migrations') {
        findTsFiles(filePath, fileList);
      } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return fileList;
}

const targetDir = process.argv[2] || path.join(__dirname, '../../src');
const files = findTsFiles(targetDir);

console.log(`Found ${files.length} TypeScript files`);
console.log('Running ESLint --fix multiple times to fix all import sorting issues...\n');

for (let i = 0; i < 3; i++) {
  try {
    console.log(`Pass ${i + 1}/3...`);
    execSync(`npm run lint`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`✅ Pass ${i + 1} completed\n`);
  } catch (error) {
    console.log(`⚠️  Pass ${i + 1} had errors (continuing...)\n`);
  }
}

console.log('✅ Import sorting completed');
