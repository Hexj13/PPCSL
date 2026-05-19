module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/src/**/*.test.ts',
    '**/src/**/*.test.tsx',
  ],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
};
