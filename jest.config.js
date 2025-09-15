/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/packages/**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  moduleNameMapper: {
    "^@testboss/cli/(.*)$": "<rootDir>/packages/cli/src/$1",
    "^@testboss/runtime/(.*)$": "<rootDir>/packages/runtime/src/$1",
    "^@testboss/ai/(.*)$": "<rootDir>/packages/ai/src/$1"
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["json", "lcov", "text", "clover"],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
