import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: "node",
  maxWorkers: 1,
  roots: ['<rootDir>/src'], // Run tests only in the src folder
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // Map @ to src folder
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore dist folder for coverage
};

export default config;