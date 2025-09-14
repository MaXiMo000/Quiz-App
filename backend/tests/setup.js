import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Import all models to ensure they are registered with Mongoose
import '../models/User.js';
import '../models/Quiz.js';
import '../models/CollaborativeSession.js';
import '../models/StudyGroup.js';
import '../models/StudySession.js';
import '../models/CollaborativeNote.js';
import '../models/GroupChallenge.js';
import '../models/DailyChallenge.js';
import '../models/Tournament.js';
import '../models/WrittenTest.js';
import '../models/Report.js';
import '../models/ReviewSchedule.js';
import '../models/XPLog.js';
import '../models/Friend.js';
import '../models/LearningAnalytics.js';
import '../models/LearningPath.js';
import '../models/CognitiveMetrics.js';
import '../models/WrittenTestReport.js';


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
