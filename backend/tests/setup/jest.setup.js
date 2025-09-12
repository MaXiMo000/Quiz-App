import { setup as mongoSetup, teardown as mongoTeardown } from "./mongo-memory-server.js";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";

beforeAll(async () => {
  await mongoSetup();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoTeardown();
});
