module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: ['<rootDir>/../dist/'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest-integration.setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};

