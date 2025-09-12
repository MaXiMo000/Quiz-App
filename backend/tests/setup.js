import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  logger.info('In-memory MongoDB connected for testing.');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  logger.info('In-memory MongoDB disconnected.');
});

// Clear all data between tests to ensure test isolation
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
