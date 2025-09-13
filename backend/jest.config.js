export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testTimeout: 30000,
  maxWorkers: 1,
  workerIdleMemoryLimit: "512MB",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "middleware/**/*.js",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  detectLeaks: true,
  maxConcurrency: 1,
  bail: false,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  resetModules: true
};
