#!/usr/bin/env node

const { spawn } = require('child_process');

const port = process.env.STORYBOOK_PORT || 6006;

console.log('\n🚀 Запуск Storybook...\n');
console.log(`📖 Storybook будет доступен на: http://localhost:${port}\n`);
console.log('⏳ Ожидание запуска сервера...\n');

const storybook = spawn('npx', ['storybook', 'dev', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true,
});

storybook.on('error', (error) => {
  console.error('❌ Ошибка запуска Storybook:', error);
  process.exit(1);
});

storybook.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Storybook завершился с кодом: ${code}`);
  }
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка Storybook...');
  storybook.kill('SIGINT');
  process.exit(0);
});
