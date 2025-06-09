/** @ts-check */

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testTimeout: 30000, // Increased timeout for file watcher tests
  maxWorkers: 1, // Force single worker to avoid interference
  detectOpenHandles: true, // Detect async operations that might interfere
  forceExit: true, // Force exit to avoid hanging on file watchers
  moduleNameMapper: {
    '^jose$': 'jose',
    '^@/(.*)$': '<rootDir>/$1',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '.temp'],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|next-auth|@panva|debug|@apollo)/)',
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
};

export default config; 