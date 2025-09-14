import { registerUser, loginUser } from "../../controllers/userController.js";
import mongoose from "mongoose";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("../../models/User.js");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("User Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
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
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully!",
      });
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
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User already exists",
      });
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
        save: jest.fn().mockResolvedValue({}),
      };

      req.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("token");

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Login successful",
          token: "token",
        })
      );
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

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });
  });
});
