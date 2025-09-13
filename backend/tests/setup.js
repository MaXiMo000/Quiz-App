import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.test" });

// Set NODE_ENV to test
process.env.NODE_ENV = "test";

let mongoServer;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: undefined, // Use random available port
      },
      binary: {
        version: "6.0.6", // Use a specific version for consistency
      },
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      maxPoolSize: 5, // Limit connection pool size
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error("Failed to start MongoDB Memory Server:", error);
    throw error;
  }
}, 60000); // Increase timeout to 60 seconds

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}, 30000); // 30 second timeout for cleanup

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (error) {
        console.error(`Error clearing collection ${key}:`, error);
      }
    }
  }
});
