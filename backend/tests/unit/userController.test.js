import { registerUser, loginUser } from "../../controllers/userController.js";
import mongoose from "mongoose";
import User from "../../models/User.js";
import XPLog from "../../models/XPLog.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { okMsg, err, invalid } from "../helpers/envelope.js";

jest.mock("../../models/User.js");
jest.mock("../../models/XPLog.js");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("User Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      // registerUser/loginUser call getClientIP(req), which reads
      // req.headers and req.socket. With only `body` present that threw and
      // the catch reported a generic 500.
      headers: {},
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      // userController sets headers on the response; without res.set the call
      // threw and the catch reported it as a generic 500.
      set: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user", async () => {
      req.body = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");
      User.prototype.save = jest.fn().mockResolvedValue({});

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        okMsg("User registered successfully!", { userId: undefined }));
    });

    it("should not register an existing user", async () => {
      req.body = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue({});

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        invalid("email", "User already exists", "User already exists"));
    });
  });

  describe("loginUser", () => {
    it("should login an existing user", async () => {
      const user = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword",
        unlockedThemes: [],
        xp: 100,
        level: 1,
        loginStreak: 1,
        quizStreak: 0,
        lastLogin: new Date(),
        save: jest.fn().mockResolvedValue({}),
      };

      // Mock XPLog.save
      XPLog.prototype.save = jest.fn().mockResolvedValue({});

      req.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("token");

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(okMsg("Login successful",
        expect.objectContaining({
          token: "token",
          user: expect.objectContaining({ email: "test@example.com" }),
        })));
    }, 30000);

    it("should not login with invalid credentials", async () => {
      req.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      User.findOne.mockResolvedValue({
        password: "hashedPassword",
      });
      bcrypt.compare.mockResolvedValue(false);

      await loginUser(req, res);

      // 401 Unauthorized, not 400. The controller corrected this and the
      // test still expected the old code.
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(err("Invalid credentials"));
    });
  });
});
