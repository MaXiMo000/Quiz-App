import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-app-test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Only create new connection if not already connected
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const User = (await import('../models/User.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(userData.password || 'Password123!', 12);
    
    const defaultUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      level: 1,
      xp: 0,
      unlockedThemes: ['default'],
      ...userData,
      password: hashedPassword // Override with hashed password
    };
    return await User.create(defaultUser);
  },
  
  createTestQuiz: async (quizData = {}) => {
    const Quiz = (await import('../models/Quiz.js')).default;
    const defaultQuiz = {
      title: 'Test Quiz',
      description: 'A test quiz',
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1
        }
      ],
      difficulty: 'easy',
      category: 'math',
      ...quizData
    };
    return await Quiz.create(defaultQuiz);
  }
};
