import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.test" });

let mongoServer;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: undefined, // Use random available port
      },
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error("Failed to start MongoDB Memory Server:", error);
    throw error;
  }
}, 60000); // Increase timeout to 60 seconds

afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}, 30000); // 30 second timeout for cleanup
