const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

module.exports = {
  rootDir: srcDir,
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.integration\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: path.join(__dirname, 'tsconfig.test.json'),
      },
    ],
  },
  transformIgnorePatterns: [path.join(projectRoot, 'dist') + '/'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: path.join(projectRoot, 'coverage-integration'),
  testEnvironment: 'node',
  setupFilesAfterEnv: [path.join(srcDir, 'test', 'jest-integration.setup.ts')],
  testTimeout: 60000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};

