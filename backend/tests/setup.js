import dotenv from "dotenv";

dotenv.config({ path: "./.env.test" });

// Set NODE_ENV to test
process.env.NODE_ENV = "test";

// Simple setup for unit tests - no database connection needed
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = "test";
}, 1000);

afterAll(async () => {
  // Clean up
  process.env.NODE_ENV = undefined;
}, 1000);

// Clean up after each test
afterEach(async () => {
  // Reset any mocks if needed
  jest.clearAllMocks();
});
