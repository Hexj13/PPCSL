module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest-integration.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};
