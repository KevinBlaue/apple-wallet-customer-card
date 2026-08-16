/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  snapshotSerializers: ['<rootDir>/cdk/snapshotSerializer.cjs'],
  roots: ['<rootDir>/canary', '<rootDir>/cdk', '<rootDir>/contract', '<rootDir>/src'],
  testPathIgnorePatterns: ['/dist/'],
  collectCoverageFrom: [
    'cdk/lib/**/*.ts',
    'src/lambda-functions/**/*.ts',
    '!cdk/bin/**',
    '!**/*.d.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
