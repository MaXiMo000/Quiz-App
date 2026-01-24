import dotenv from "dotenv";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config({ path: "./.env.test" });

// Set NODE_ENV to test
process.env.NODE_ENV = "test";

let mongoServer;

// Setup database connection
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = "test";

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongoUri);
}, 30000); // Increased timeout for download

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  // Clean up
  process.env.NODE_ENV = undefined;
}, 10000);

// Clean up after each test
afterEach(async () => {
  // Reset any mocks if needed
  jest.clearAllMocks();
});
