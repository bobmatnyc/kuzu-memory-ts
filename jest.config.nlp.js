module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use node environment for NLP tests
  roots: ['<rootDir>/tests/nlp'],
  testMatch: [
    '**/tests/nlp/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  setupFiles: ['<rootDir>/tests/nlp/setup.js'],
  testTimeout: 20000, // NLP tests may take longer
  clearMocks: true,
  restoreMocks: true,
};