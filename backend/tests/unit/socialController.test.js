import request from "supertest";
import express from "express";

// Mock the models
jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../../models/Friend.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndDelete: jest.fn(),
        create: jest.fn(),
    },
}));

// Import after mocking
import { sendFriendRequest, getFriends } from "../../controllers/socialController.js";
import UserQuiz from "../../models/User.js";

const app = express();
app.use(express.json());

// Add middleware to set req.user
app.use((req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
    next();
});

app.post("/api/social/friend-request", sendFriendRequest);
app.get("/api/social/friends", getFriends);

describe("Social Controller - Simple", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should handle missing recipient ID", async () => {
        const res = await request(app)
            .post("/api/social/friend-request")
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            message: "Recipient ID is required"
        });
    }, 10000);

    it("should handle self-friend request", async () => {
        const res = await request(app)
            .post("/api/social/friend-request")
            .send({ recipientId: "60c72b9f9b1d8c001f8e4a3a" });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            message: "Cannot send friend request to yourself"
        });
    }, 10000);

    it("should handle user not found", async () => {
        UserQuiz.findById.mockResolvedValue(null);

        const res = await request(app)
            .post("/api/social/friend-request")
            .send({ recipientId: "nonexistent" });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            message: "User not found"
        });
    }, 10000);
});
