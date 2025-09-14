import {
    getCurrentDailyChallenge,
    joinDailyChallenge,
    updateChallengeProgress,
    createDailyChallenge,
    getAvailableTournaments,
    registerForTournament,
    getTournamentLeaderboard,
    manualResetDailyChallenges,
}
from "../../controllers/gamificationController.js";
import DailyChallenge from "../../models/DailyChallenge.js";
import Tournament from "../../models/Tournament.js";
import UserQuiz from "../../models/User.js";

// Mock the isChallengeAvailableForUser function
jest.mock("../../controllers/gamificationController.js", () => {
    const originalModule = jest.requireActual("../../controllers/gamificationController.js");
    return {
        ...originalModule,
        isChallengeAvailableForUser: jest.fn()
    };
});

// Mock the models with proper method implementations
jest.mock("../../models/DailyChallenge.js", () => {
    const mockConstructor = jest.fn();
    mockConstructor.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
    }));

    // Create static methods
    const staticMethods = {
        find: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    };

    // Attach static methods to constructor
    Object.assign(mockConstructor, staticMethods);

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

jest.mock("../../models/Tournament.js", () => {
    const mockConstructor = jest.fn();
    const staticMethods = {
        find: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        create: jest.fn(),
    };
    Object.assign(mockConstructor, staticMethods);

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

jest.mock("../../models/User.js", () => {
    const mockConstructor = jest.fn();
    const staticMethods = {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        find: jest.fn(),
    };
    Object.assign(mockConstructor, staticMethods);

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

jest.mock("../../models/Quiz.js", () => {
    const mockConstructor = jest.fn();
    const staticMethods = {
        find: jest.fn(),
        findById: jest.fn(),
    };
    Object.assign(mockConstructor, staticMethods);

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

jest.mock("../../models/Report.js", () => {
    const mockConstructor = jest.fn();
    const staticMethods = {
        find: jest.fn(),
        findById: jest.fn(),
    };
    Object.assign(mockConstructor, staticMethods);

    return {
        __esModule: true,
        default: mockConstructor,
    };
});

describe("Gamification Controller", () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: "userId" },
            body: {},
            params: {},
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getCurrentDailyChallenge", () => {
        it("should return the current daily challenge", async () => {
            const mockChallenge = {
                toObject: () => ({
                    _id: "challengeId",
                    title: "Daily Quiz Challenge",
                    description: "Complete 5 quizzes today",
                    targetQuizzes: 5,
                    xpReward: 100,
                    participants: []
                }),
                participants: [],
            };
            DailyChallenge.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([mockChallenge]),
            });

            await getCurrentDailyChallenge(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    challenges: expect.any(Array),
                })
            );
        });

        it("should handle no challenges found", async () => {
            DailyChallenge.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([]),
            });

            await getCurrentDailyChallenge(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: "No daily challenges available today",
                suggestion: "Check back later for new challenges!"
            });
        });

        it("should handle database errors", async () => {
            DailyChallenge.find.mockReturnValue({
                populate: jest.fn().mockRejectedValue(new Error("Database error")),
            });

            await getCurrentDailyChallenge(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
        });
    });

    describe("joinDailyChallenge", () => {
        it("should join user to daily challenge", async () => {
            const mockChallenge = {
                _id: "challengeId",
                participants: [],
                isActive: true,
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                stats: { totalParticipants: 0 },
                save: jest.fn().mockResolvedValue(true),
            };
            const mockUser = {
                _id: "userId",
                name: "Test User",
                xp: 100,
                level: 1,
            };

            DailyChallenge.findById.mockResolvedValue(mockChallenge);
            UserQuiz.findById.mockResolvedValue(mockUser);

            req.params.challengeId = "challengeId";

            await joinDailyChallenge(req, res);

            expect(mockChallenge.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully joined daily challenge",
                challenge: mockChallenge
            });
        });

        it("should handle challenge not found", async () => {
            DailyChallenge.findById.mockResolvedValue(null);

            req.params.challengeId = "nonexistent";

            await joinDailyChallenge(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Challenge not found" });
        });

        it("should handle user already joined", async () => {
            const mockChallenge = {
                _id: "challengeId",
                participants: [{ user: "userId", progress: 0, completed: false }],
                isActive: true,
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
            };

            DailyChallenge.findById.mockResolvedValue(mockChallenge);

            req.params.challengeId = "challengeId";

            await joinDailyChallenge(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Already participating in this challenge" });
        });
    });

    describe("updateChallengeProgress", () => {
        it("should update user progress in challenge", async () => {
            const mockChallenge = {
                _id: "challengeId",
                participants: [{
                    user: "userId",
                    progress: 2,
                    completed: false,
                    joinedAt: new Date()
                }],
                save: jest.fn().mockResolvedValue(true),
            };

            DailyChallenge.findById.mockResolvedValue(mockChallenge);

            req.params.challengeId = "challengeId";
            req.body.progress = 3;

            await updateChallengeProgress(req, res);

            expect(mockChallenge.participants[0].progress).toBe(3);
            expect(mockChallenge.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                message: "Progress updated",
                participant: expect.any(Object),
                isCompleted: false,
                rewards: null
            });
        });

    });

    describe("createDailyChallenge", () => {
        it("should create a new daily challenge", async () => {
            const mockChallenge = {
                _id: "newChallengeId",
                title: "Test Challenge",
                description: "Test Description",
                targetQuizzes: 3,
                xpReward: 50,
                save: jest.fn().mockResolvedValue(true),
            };

            DailyChallenge.mockImplementation(() => mockChallenge);
            req.user.role = "admin";

            req.body = {
                title: "Test Challenge",
                description: "Test Description",
                targetQuizzes: 3,
                xpReward: 50
            };

            await createDailyChallenge(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Daily challenge created successfully",
                challenge: mockChallenge
            });
        });

        it("should handle missing required fields", async () => {
            const req = {
                user: { id: "userId", role: "admin" },
                body: {}
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            req.user.role = "admin";
            req.body = {
                // Missing title - the required field
            };

            await createDailyChallenge(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Title is required"
            });
        });
    });

    describe("getAvailableTournaments", () => {
        it("should return available tournaments", async () => {
            const mockTournaments = [
                {
                    _id: "tournament1",
                    title: "Weekly Tournament",
                    description: "Compete with others",
                    tournamentStart: new Date(),
                    tournamentEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    maxParticipants: 100,
                    participants: [],
                    status: "upcoming",
                    quizzes: [],
                    toObject: function() { return this; }
                }
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockTournaments)
            };
            Tournament.find.mockReturnValue(mockQuery);

            await getAvailableTournaments(req, res);

            expect(res.json).toHaveBeenCalledWith({
                tournaments: expect.any(Array)
            });
        });
    });

    describe("registerForTournament", () => {
        it("should register user for tournament", async () => {
            const mockTournament = {
                _id: "tournamentId",
                participants: [],
                settings: { maxParticipants: 100, entryFee: 0 },
                registrationStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                registrationEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                stats: { totalParticipants: 0 },
                save: jest.fn().mockResolvedValue(true),
            };
            const mockUser = {
                _id: "userId",
                xp: 1000,
                save: jest.fn().mockResolvedValue(true),
            };

            Tournament.findById.mockResolvedValue(mockTournament);
            UserQuiz.findById.mockResolvedValue(mockUser);

            req.params.tournamentId = "tournamentId";

            await registerForTournament(req, res);

            expect(mockTournament.participants).toContainEqual({
                user: "userId",
                registeredAt: expect.any(Date),
                currentScore: 0,
                totalTime: 0,
                quizzesCompleted: 0,
                rank: 0,
                completedQuizzes: [],
                quizScores: []
            });
            expect(mockTournament.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully registered for tournament",
                tournament: mockTournament
            });
        });

        it("should handle tournament full", async () => {
            const mockTournament = {
                _id: "tournamentId",
                participants: new Array(100).fill({ user: "otherUser" }),
                settings: { maxParticipants: 100, entryFee: 0 },
                registrationStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                registrationEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            };

            Tournament.findById.mockResolvedValue(mockTournament);

            req.params.tournamentId = "tournamentId";

            await registerForTournament(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Tournament is full" });
        });
    });

    describe("getTournamentLeaderboard", () => {
        it("should return tournament leaderboard", async () => {
            const mockTournament = {
                _id: "tournamentId",
                name: "Test Tournament",
                status: "active",
                settings: { entryFee: 0 },
                participants: [
                    { user: { name: "User 1" }, currentScore: 100, totalTime: 100, quizzesCompleted: 5, eliminated: false },
                    { user: { name: "User 2" }, currentScore: 80, totalTime: 120, quizzesCompleted: 4, eliminated: false },
                    { user: { name: "Test User" }, currentScore: 60, totalTime: 150, quizzesCompleted: 3, eliminated: false }
                ]
            };

            Tournament.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockTournament)
            });

            req.params.tournamentId = "tournamentId";

            await getTournamentLeaderboard(req, res);

            expect(res.json).toHaveBeenCalledWith({
                tournament: {
                    name: "Test Tournament",
                    status: "active",
                    settings: { entryFee: 0 }
                },
                leaderboard: expect.any(Array)
            });
        });
    });

    describe("resetDailyChallenges", () => {
        it("should reset daily challenges", async () => {
            req.user.role = "admin";
            DailyChallenge.find.mockResolvedValue([]);

            await manualResetDailyChallenges(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: "Daily challenge reset completed successfully",
                usersReset: 0,
                challengesModified: 0,
                timestamp: expect.any(Date)
            });
        });
    });

});
