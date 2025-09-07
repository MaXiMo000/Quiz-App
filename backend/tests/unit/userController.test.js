import { describe, it, expect, beforeEach } from '@jest/globals';
import { registerUser, loginUser, unlockThemesForLevel } from '../../controllers/userController.js';
import User from '../../models/User.js';

describe('User Controller', () => {
  let testUser;

  beforeEach(async () => {
    // Clean up any existing test data
    await User.deleteMany({});
  });

  describe('unlockThemesForLevel', () => {
    it('should unlock themes based on user level', () => {
      const user = {
        level: 7,
        unlockedThemes: ['default']
      };

      unlockThemesForLevel(user);

      expect(user.unlockedThemes).toContain('Light');
      expect(user.unlockedThemes).toContain('Dark');
      expect(user.unlockedThemes).toContain('Galaxy');
      expect(user.unlockedThemes).toContain('Forest');
      expect(user.unlockedThemes).toContain('material-light');
      expect(user.unlockedThemes).toContain('material-dark');
    });

    it('should not unlock themes for level 1 user', () => {
      const user = {
        level: 1,
        unlockedThemes: ['default']
      };

      unlockThemesForLevel(user);

      expect(user.unlockedThemes).toEqual(['default']);
    });

    it('should not duplicate themes if already unlocked', () => {
      const user = {
        level: 3,
        unlockedThemes: ['default', 'Light', 'Dark']
      };

      const initialLength = user.unlockedThemes.length;
      unlockThemesForLevel(user);

      expect(user.unlockedThemes).toContain('Light');
      expect(user.unlockedThemes).toContain('Dark');
      expect(user.unlockedThemes.length).toBe(initialLength);
    });
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const req = {
        body: userData
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully!'
      });

      // Verify user was created in database
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser.name).toBe(userData.name);
    });

    it('should return error for missing required fields', async () => {
      const req = {
        body: {
          name: 'Test User'
          // Missing email and password
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required')
        })
      );
    });

    it('should return error for duplicate email', async () => {
      // First, create a user
      const existingUser = await global.testUtils.createTestUser({
        email: 'test@example.com'
      });

      const req = {
        body: {
          name: 'Another User',
          email: 'test@example.com',
          password: 'Password123!'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists')
        })
      );
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Password123!'
      });
    });

    it('should login user with valid credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'Password123!'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'test@example.com'
          })
        })
      );
    });

    it('should return error for invalid email', async () => {
      const req = {
        body: {
          email: 'nonexistent@example.com',
          password: 'Password123!'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });

    it('should return error for invalid password', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'WrongPassword123!'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });
  });
});
