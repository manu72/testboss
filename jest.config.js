/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/packages/**/*.test.ts",
    "<rootDir>/packages/**/*.spec.ts"
  ],
  moduleNameMapper: {
    "^@test-boss/(.*)$": "<rootDir>/packages/$1/src"
  },
  collectCoverageFrom: [
    "<rootDir>/packages/**/src/**/*.ts",
    "!**/node_modules/**",
    "!**/dist/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["json", "lcov", "text", "clover"]
};
