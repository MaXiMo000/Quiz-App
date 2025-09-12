module.exports = {
    testEnvironment: "node",
    testTimeout: 20000,
    setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
    testMatch: ["**/tests/**/*.test.js"],
    moduleFileExtensions: ["js", "json", "node", "cjs"],
    transform: {},
  };
