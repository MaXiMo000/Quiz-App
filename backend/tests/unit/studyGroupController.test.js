import request from "supertest";
import express from "express";

// Mock the models
jest.mock("../../models/StudyGroup.js", () => {
    const mockStudyGroup = jest.fn().mockImplementation((data) => ({
        ...data,
        _id: "groupId",
        save: jest.fn().mockResolvedValue({
            _id: "groupId",
            name: data.name,
            description: data.description,
            isPrivate: data.isPrivate,
            maxMembers: data.maxMembers,
            category: data.category,
            tags: data.tags,
            creator: data.creator,
            members: data.members,
            activities: data.activities
        }),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
            _id: "groupId",
            name: data.name,
            description: data.description,
            isPrivate: data.isPrivate,
            maxMembers: data.maxMembers,
            category: data.category,
            tags: data.tags,
            creator: data.creator,
            members: data.members,
            activities: data.activities
        }),
    }));

    mockStudyGroup.findById = jest.fn();
    mockStudyGroup.find = jest.fn();
    mockStudyGroup.findOne = jest.fn();
    mockStudyGroup.findByIdAndUpdate = jest.fn();
    mockStudyGroup.findByIdAndDelete = jest.fn();
    mockStudyGroup.create = jest.fn().mockResolvedValue({
        _id: "groupId",
        name: "JavaScript Study Group",
        description: "Learning JavaScript together",
        isPrivate: false,
        maxMembers: 20,
        creator: "60c72b9f9b1d8c001f8e4a3a",
        members: [{
            user: "60c72b9f9b1d8c001f8e4a3a",
            role: "admin",
            joinedAt: new Date()
        }],
        activities: [{
            type: "member_joined",
            user: "60c72b9f9b1d8c001f8e4a3a",
            details: { message: "Study group created" },
            timestamp: new Date()
        }],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
            _id: "groupId",
            name: "JavaScript Study Group",
            description: "Learning JavaScript together",
            isPrivate: false,
            maxMembers: 20,
            creator: "60c72b9f9b1d8c001f8e4a3a",
            members: [{
                user: "60c72b9f9b1d8c001f8e4a3a",
                role: "admin",
                joinedAt: new Date()
            }],
            activities: [{
                type: "member_joined",
                user: "60c72b9f9b1d8c001f8e4a3a",
                details: { message: "Study group created" },
                timestamp: new Date()
            }]
        })
    });

    return {
        __esModule: true,
        default: mockStudyGroup,
    };
});

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
    },
}));

// Import after mocking
import { createStudyGroup, joinStudyGroup, getStudyGroupDetails } from "../../controllers/studyGroupController.js";
import StudyGroup from "../../models/StudyGroup.js";
import UserQuiz from "../../models/User.js";

const app = express();
app.use(express.json());

// Add middleware to set req.user
app.use((req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
    next();
});

app.post("/api/study-groups", createStudyGroup);
app.post("/api/study-groups/:groupId/join", joinStudyGroup);
app.get("/api/study-groups/:groupId", getStudyGroupDetails);

describe("Study Group Controller - Working", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should handle missing required fields", async () => {
        const res = await request(app)
            .post("/api/study-groups")
            .send({
                name: "JS" // Too short
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            message: "Study group name must be at least 3 characters"
        });
    }, 10000);

    it("should handle study group not found", async () => {
        StudyGroup.findById.mockResolvedValue(null);

        const res = await request(app)
            .post("/api/study-groups/nonexistent/join");

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
            message: "Study group not found"
        });
    }, 10000);

    it("should create study group successfully", async () => {
        const mockUser = {
            _id: "60c72b9f9b1d8c001f8e4a3a",
            social: {
                socialStats: {
                    groupsCreated: 0
                }
            }
        };

        UserQuiz.findById.mockResolvedValue(mockUser);
        UserQuiz.findByIdAndUpdate.mockResolvedValue(mockUser);

        // Mock the StudyGroup constructor to return a proper instance
        const mockStudyGroupInstance = {
            _id: "groupId",
            name: "JavaScript Study Group",
            description: "Learning JavaScript together",
            isPrivate: false,
            maxMembers: 20,
            creator: "60c72b9f9b1d8c001f8e4a3a",
            members: [{
                user: "60c72b9f9b1d8c001f8e4a3a",
                role: "admin",
                joinedAt: new Date()
            }],
            activities: [{
                type: "member_joined",
                user: "60c72b9f9b1d8c001f8e4a3a",
                details: { message: "Study group created" },
                timestamp: new Date()
            }],
            save: jest.fn().mockResolvedValue({
                _id: "groupId",
                name: "JavaScript Study Group",
                description: "Learning JavaScript together",
                isPrivate: false,
                maxMembers: 20,
                creator: "60c72b9f9b1d8c001f8e4a3a",
                members: [{
                    user: "60c72b9f9b1d8c001f8e4a3a",
                    role: "admin",
                    joinedAt: new Date()
                }],
                activities: [{
                    type: "member_joined",
                    user: "60c72b9f9b1d8c001f8e4a3a",
                    details: { message: "Study group created" },
                    timestamp: new Date()
                }]
            })
        };

        // Reset the mock implementation for this test
        StudyGroup.mockImplementation((data) => ({
            ...data,
            _id: "groupId",
            save: jest.fn().mockResolvedValue({
                _id: "groupId",
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate,
                maxMembers: data.maxMembers,
                category: data.category,
                tags: data.tags,
                creator: data.creator,
                members: data.members,
                activities: data.activities
            }),
            populate: jest.fn().mockReturnThis(),
            toObject: jest.fn().mockReturnValue({
                _id: "groupId",
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate,
                maxMembers: data.maxMembers,
                category: data.category,
                tags: data.tags,
                creator: data.creator,
                members: data.members,
                activities: data.activities
            })
        }));

        const res = await request(app)
            .post("/api/study-groups")
            .send({
                name: "JavaScript Study Group",
                description: "Learning JavaScript together",
                isPrivate: false,
                maxMembers: 20
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            message: "Study group created successfully",
            studyGroup: expect.any(Object)
        });
    }, 10000);
});
