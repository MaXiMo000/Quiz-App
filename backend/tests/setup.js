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
