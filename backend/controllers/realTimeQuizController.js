import { Server } from "socket.io";
import Quiz from "../models/Quiz.js";
import UserQuiz from "../models/User.js";
import logger from "../utils/logger.js";

// In-memory store for active quiz rooms
const activeRooms = new Map();
const userSockets = new Map(); // userId -> socketId mapping

// Room data structure
class QuizRoom {
    constructor(id, hostId, settings) {
        this.id = id;
        this.hostId = hostId;
        this.settings = settings;
        this.players = new Map(); // userId -> player data
        this.status = "waiting"; // waiting, in_progress, finished
        this.currentQuestion = 0;
        this.quiz = null;
        this.startTime = null;
        this.questionStartTime = null;
        this.answers = new Map(); // questionIndex -> Map(userId -> answer)
        this.scores = new Map(); // userId -> score
        this.createdAt = new Date();
    }

    addPlayer(userId, userInfo) {
        this.players.set(userId, {
            id: userId, // Add the id field explicitly
            ...userInfo,
            joinedAt: new Date(),
            score: 0,
            answers: [],
            connected: true
        });
    }

    removePlayer(userId) {
        this.players.delete(userId);
    }

    getAllPlayers() {
        return Array.from(this.players.values());
    }

    getPlayerCount() {
        return this.players.size;
    }

    isHost(userId) {
        return this.hostId === userId;
    }

    canStart() {
        return this.players.size >= 2 && this.quiz && this.status === "waiting";
    }
}

export const initializeRealTimeQuiz = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Socket.IO middleware for authentication
    io.use(async (socket, next) => {
        logger.info(`Authenticating socket connection for user ${socket.handshake.auth.token ? "with token" : "without token"}`);
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                logger.warn("Socket connection failed: No token provided");
                return next(new Error("No token provided"));
            }

            // Verify JWT token (reuse your existing auth logic)
            const jwt = await import("jsonwebtoken");
            const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

            const user = await UserQuiz.findById(decoded.id);
            if (!user) {
                logger.warn(`Socket connection failed: User not found with ID ${decoded.id}`);
                return next(new Error("User not found"));
            }

            socket.userId = user._id.toString();
            socket.userInfo = {
                id: user._id.toString(),
                name: user.name,
                level: user.level,
                xp: user.xp,
                avatar: user.name.charAt(0).toUpperCase()
            };

            userSockets.set(socket.userId, socket.id);
            logger.info(`Socket connection authenticated for user ${socket.userId}`);
            next();
        } catch (error) {
            logger.error({ message: "Socket authentication failed", error: error.message, stack: error.stack });
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`User ${socket.userId} connected to real-time quiz service`);

        // Send user info to frontend
        socket.emit("authenticated", socket.userInfo);

        // Create a new quiz room
        socket.on("create_room", async (data) => {
            logger.info(`User ${socket.userId} creating a new quiz room`);
            try {
                const { quizId, settings } = data;

                // Validate quiz exists
                const quiz = await Quiz.findById(quizId);
                if (!quiz) {
                    logger.warn(`Quiz not found: ${quizId} when creating room`);
                    socket.emit("error", { message: "Quiz not found" });
                    return;
                }

                // Generate unique room ID
                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

                // Create room
                const room = new QuizRoom(roomId, socket.userId, {
                    maxPlayers: settings.maxPlayers || 6,
                    timePerQuestion: settings.timePerQuestion || 30,
                    questionCount: settings.questionCount || quiz.questions.length,
                    ...settings
                });

                room.quiz = quiz;
                room.addPlayer(socket.userId, socket.userInfo);
                activeRooms.set(roomId, room);

                // Join socket room
                socket.join(roomId);
                socket.currentRoom = roomId;

                logger.info(`User ${socket.userId} created room ${roomId}`);
                socket.emit("room_created", {
                    roomId,
                    room: {
                        id: roomId,
                        hostId: room.hostId,
                        players: room.getAllPlayers(),
                        playerCount: room.getPlayerCount(),
                        settings: room.settings,
                        status: room.status,
                        quiz: {
                            id: quiz._id,
                            title: quiz.title,
                            category: quiz.category,
                            questionCount: quiz.questions.length
                        }
                    }
                });

            } catch (error) {
                logger.error({ message: `Error creating room for user ${socket.userId}`, error: error.message, stack: error.stack });
                socket.emit("error", { message: "Failed to create room" });
            }
        });

        // Join an existing room
        socket.on("join_room", (data) => {
            logger.info(`User ${socket.userId} attempting to join room ${data.roomId}`);
            try {
                const { roomId } = data;
                const room = activeRooms.get(roomId);

                if (!room) {
                    logger.warn(`Room not found: ${roomId} when user ${socket.userId} attempted to join`);
                    socket.emit("error", { message: "Room not found" });
                    return;
                }

                if (room.status !== "waiting") {
                    logger.warn(`User ${socket.userId} attempted to join room ${roomId} which is not waiting for players`);
                    socket.emit("error", { message: "Room is not accepting new players" });
                    return;
                }

                if (room.getPlayerCount() >= room.settings.maxPlayers) {
                    logger.warn(`User ${socket.userId} attempted to join full room ${roomId}`);
                    socket.emit("error", { message: "Room is full" });
                    return;
                }

                if (room.players.has(socket.userId)) {
                    logger.warn(`User ${socket.userId} attempted to join room ${roomId} they are already in`);
                    socket.emit("error", { message: "Already in this room" });
                    return;
                }

                // Add player to room
                room.addPlayer(socket.userId, socket.userInfo);
                socket.join(roomId);
                socket.currentRoom = roomId;

                // Notify all players
                io.to(roomId).emit("player_joined", {
                    player: socket.userInfo,
                    players: room.getAllPlayers(),
                    playerCount: room.getPlayerCount()
                });

                // Send room data to joining player
                logger.info(`User ${socket.userId} successfully joined room ${roomId}`);
                socket.emit("room_joined", {
                    room: {
                        id: roomId,
                        hostId: room.hostId,
                        players: room.getAllPlayers(),
                        playerCount: room.getPlayerCount(),
                        settings: room.settings,
                        status: room.status,
                        quiz: {
                            id: room.quiz._id,
                            title: room.quiz.title,
                            category: room.quiz.category,
                            questionCount: room.quiz.questions.length
                        }
                    }
                });

            } catch (error) {
                logger.error({ message: `Error joining room for user ${socket.userId}`, error: error.message, stack: error.stack });
                socket.emit("error", { message: "Failed to join room" });
            }
        });

        // Start the quiz (host only)
        socket.on("start_quiz", () => {
            logger.info(`User ${socket.userId} attempting to start quiz in room ${socket.currentRoom}`);
            try {
                const roomId = socket.currentRoom;
                const room = activeRooms.get(roomId);

                if (!room) {
                    logger.warn(`Room not found: ${roomId} when user ${socket.userId} attempted to start quiz`);
                    socket.emit("error", { message: "Room not found" });
                    return;
                }

                if (!room.isHost(socket.userId)) {
                    logger.warn(`Non-host user ${socket.userId} attempted to start quiz in room ${roomId}`);
                    socket.emit("error", { message: "Only the host can start the quiz" });
                    return;
                }

                if (!room.canStart()) {
                    const reasons = [];
                    if (room.players.size < 2) reasons.push("Need at least 2 players");
                    if (!room.quiz) reasons.push("No quiz selected");
                    if (room.status !== "waiting") reasons.push(`Room status is ${room.status}, should be waiting`);

                    logger.warn(`Cannot start quiz in room ${roomId}: ${reasons.join(", ")}`);
                    socket.emit("error", { message: `Cannot start quiz: ${reasons.join(", ")}` });
                    return;
                }

                // Initialize quiz state
                room.status = "in_progress";
                room.currentQuestion = 0;
                room.startTime = new Date();
                room.scores.clear();
                room.answers.clear();

                // Initialize player scores
                room.players.forEach((player, userId) => {
                    room.scores.set(userId, 0);
                });

                // Start first question
                logger.info(`Quiz started in room ${roomId}`);
                startQuestion(room, io);

            } catch (error) {
                logger.error({ message: `Error starting quiz in room ${socket.currentRoom}`, error: error.message, stack: error.stack });
                socket.emit("error", { message: "Failed to start quiz" });
            }
        });

        // Submit answer
        socket.on("submit_answer", (data) => {
            logger.info(`User ${socket.userId} submitting answer in room ${socket.currentRoom}`);
            try {
                const { answer, timeSpent } = data;
                const roomId = socket.currentRoom;
                const room = activeRooms.get(roomId);

                if (!room || room.status !== "in_progress") {
                    logger.warn(`User ${socket.userId} attempted to submit answer in invalid room ${roomId} or quiz not in progress`);
                    socket.emit("error", { message: "Invalid room or quiz not in progress" });
                    return;
                }

                const questionIndex = room.currentQuestion;
                if (!room.answers.has(questionIndex)) {
                    room.answers.set(questionIndex, new Map());
                }

                // Record answer
                room.answers.get(questionIndex).set(socket.userId, {
                    answer,
                    timeSpent,
                    submittedAt: new Date()
                });

                // Update player data
                const player = room.players.get(socket.userId);
                if (player) {
                    player.answers[questionIndex] = { answer, timeSpent };
                }

                // Check if all players have answered
                const playersAnswered = room.answers.get(questionIndex).size;
                const totalPlayers = room.getPlayerCount();

                io.to(roomId).emit("answer_submitted", {
                    playerId: socket.userId,
                    playerName: socket.userInfo.name,
                    answeredCount: playersAnswered,
                    totalPlayers
                });

                // If all answered or time is up, move to next question
                if (playersAnswered === totalPlayers) {
                    logger.info(`All players have answered in room ${roomId}, moving to next question`);
                    setTimeout(() => nextQuestion(room, io), 2000); // 2 second delay
                }

            } catch (error) {
                logger.error({ message: `Error submitting answer for user ${socket.userId} in room ${socket.currentRoom}`, error: error.message, stack: error.stack });
                socket.emit("error", { message: "Failed to submit answer" });
            }
        });

        // Leave room
        socket.on("leave_room", () => {
            leaveRoom(socket, io);
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            logger.info(`User ${socket.userId} disconnected`);
            leaveRoom(socket, io);
            userSockets.delete(socket.userId);
        });

        // Chat message in room
        socket.on("chat_message", (data) => {
            try {
                const { message } = data;
                const roomId = socket.currentRoom;

                if (!roomId || !activeRooms.has(roomId)) {
                    return;
                }

                io.to(roomId).emit("chat_message", {
                    playerId: socket.userId,
                    playerName: socket.userInfo.name,
                    message,
                    timestamp: new Date()
                });
            } catch (error) {
                logger.error({ message: `Error sending chat message from user ${socket.userId} in room ${socket.currentRoom}`, error: error.message, stack: error.stack });
            }
        });
    });

    // Helper functions
    function startQuestion(room, io) {
        const questionIndex = room.currentQuestion;
        const question = room.quiz.questions[questionIndex];

        if (!question) {
            endQuiz(room, io);
            return;
        }

        room.questionStartTime = new Date();

        // Send question to all players (without correct answer)
        io.to(room.id).emit("new_question", {
            questionIndex,
            question: {
                question: question.question,
                options: question.options,
                questionNumber: questionIndex + 1,
                totalQuestions: room.quiz.questions.length
            },
            timeLimit: room.settings.timePerQuestion
        });

        // Auto-advance after time limit
        setTimeout(() => {
            if (room.status === "in_progress" && room.currentQuestion === questionIndex) {
                nextQuestion(room, io);
            }
        }, room.settings.timePerQuestion * 1000);
    }

    function nextQuestion(room, io) {
        // Calculate scores for current question
        const questionIndex = room.currentQuestion;
        const question = room.quiz.questions[questionIndex];
        const correctAnswer = question.correctAnswer;
        const questionAnswers = room.answers.get(questionIndex) || new Map();

        const results = [];
        room.players.forEach((player, userId) => {
            const playerAnswer = questionAnswers.get(userId);

            // Handle both number and letter format answers
            let isCorrect = false;
            if (playerAnswer) {
                if (typeof correctAnswer === "string" && typeof playerAnswer.answer === "number") {
                    // Convert letter answer (A, B, C, D) to number (0, 1, 2, 3)
                    const letterToNumber = { "A": 0, "B": 1, "C": 2, "D": 3 };
                    isCorrect = playerAnswer.answer === letterToNumber[correctAnswer];
                } else if (typeof correctAnswer === "number" && typeof playerAnswer.answer === "string") {
                    // Convert number answer to letter format
                    const numberToLetter = { 0: "A", 1: "B", 2: "C", 3: "D" };
                    isCorrect = numberToLetter[playerAnswer.answer] === correctAnswer;
                } else {
                    // Same type comparison
                    isCorrect = playerAnswer.answer === correctAnswer;
                }
            }

            let points = 0;
            if (isCorrect) {
                // Award points based on speed (faster = more points)
                const maxPoints = 1000;
                const timeBonus = Math.max(0, (room.settings.timePerQuestion - (playerAnswer?.timeSpent || room.settings.timePerQuestion)) / room.settings.timePerQuestion);
                points = Math.round(maxPoints * (0.5 + 0.5 * timeBonus));

                const currentScore = room.scores.get(userId) || 0;
                room.scores.set(userId, currentScore + points);
            }

            results.push({
                playerId: userId,
                playerName: player.name,
                answer: playerAnswer?.answer,
                isCorrect,
                points,
                totalScore: room.scores.get(userId) || 0
            });
        });

        // Send question results
        io.to(room.id).emit("question_results", {
            questionIndex,
            correctAnswer,
            explanation: question.explanation || null,
            results,
            leaderboard: getLeaderboard(room)
        });

        // Move to next question or end quiz
        room.currentQuestion++;
        if (room.currentQuestion >= room.quiz.questions.length) {
            setTimeout(() => endQuiz(room, io), 3000); // 3 second delay before ending
        } else {
            setTimeout(() => startQuestion(room, io), 5000); // 5 second delay before next question
        }
    }

    function endQuiz(room, io) {
        room.status = "finished";
        const finalLeaderboard = getLeaderboard(room);

        // Update user XP and stats
        updatePlayerStats(room);

        io.to(room.id).emit("quiz_finished", {
            leaderboard: finalLeaderboard,
            totalQuestions: room.quiz.questions.length,
            duration: Math.round((new Date() - room.startTime) / 1000)
        });

        // Clean up room after 5 minutes
        setTimeout(() => {
            activeRooms.delete(room.id);
        }, 5 * 60 * 1000);

    }

    function getLeaderboard(room) {
        const leaderboard = [];
        room.players.forEach((player, userId) => {
            leaderboard.push({
                playerId: userId,
                playerName: player.name,
                score: room.scores.get(userId) || 0,
                avatar: player.avatar,
                level: player.level
            });
        });

        return leaderboard.sort((a, b) => b.score - a.score);
    }

    async function updatePlayerStats(room) {
        const leaderboard = getLeaderboard(room);

        for (let i = 0; i < leaderboard.length; i++) {
            const player = leaderboard[i];
            try {
                const user = await UserQuiz.findById(player.playerId);
                if (user) {
                    // Award XP based on position
                    const xpReward = Math.max(50, 200 - (i * 30)); // 200 XP for 1st, 170 for 2nd, etc.
                    user.xp += xpReward;
                    user.totalXP += xpReward;

                    // Update social stats - ensure structure exists
                    if (!user.social) user.social = {};
                    if (!user.social.socialStats) user.social.socialStats = {};

                    // Add multiplayer game stats (add missing fields to existing structure)
                    user.social.socialStats.multiplayerGames = (user.social.socialStats.multiplayerGames || 0) + 1;

                    if (i === 0) { // Winner
                        user.social.socialStats.multiplayerWins = (user.social.socialStats.multiplayerWins || 0) + 1;
                        if (!user.badges) {
                            user.badges = [];
                        }
                        if (!user.badges.includes("Multiplayer Champion")) {
                            user.badges.push("Multiplayer Champion");
                        }
                    }

                    // Update level based on XP
                    const newLevel = Math.floor(user.xp / 1000) + 1;
                    if (newLevel > user.level) {
                        user.level = newLevel;
                    }

                    await user.save();
                    logger.info(`Updated stats for player ${player.playerId} in room ${room.id}`);
                }
            } catch (error) {
                logger.error({ message: `Error updating stats for player ${player.playerId} in room ${room.id}`, error: error.message, stack: error.stack });
            }
        }
    }

    function leaveRoom(socket, io) {
        const roomId = socket.currentRoom;
        if (!roomId) return;

        const room = activeRooms.get(roomId);
        if (!room) return;

        room.removePlayer(socket.userId);
        socket.leave(roomId);
        socket.currentRoom = null;

        logger.info(`User ${socket.userId} left room ${roomId}`);
        // Notify other players
        io.to(roomId).emit("player_left", {
            playerId: socket.userId,
            playerName: socket.userInfo?.name,
            players: room.getAllPlayers(),
            playerCount: room.getPlayerCount()
        });

        // If host left, transfer to another player or close room
        if (room.isHost(socket.userId)) {
            if (room.getPlayerCount() > 0) {
                const newHost = room.getAllPlayers()[0];
                room.hostId = newHost.id;
                logger.info(`Host of room ${roomId} changed to ${newHost.id}`);
                io.to(roomId).emit("host_changed", {
                    newHostId: newHost.id,
                    newHostName: newHost.name
                });
            } else {
                // No players left, delete room
                logger.info(`Room ${roomId} is empty, deleting`);
                activeRooms.delete(roomId);
            }
        }

    }

    return io;
};

// REST API endpoints for room management
export const getRoomStatus = async (req, res) => {
    logger.info(`Getting status for room ${req.params.roomId}`);
    try {
        const { roomId } = req.params;
        const room = activeRooms.get(roomId);

        if (!room) {
            logger.warn(`Room not found: ${roomId} when getting status`);
            return res.status(404).json({ message: "Room not found" });
        }

        logger.info(`Successfully fetched status for room ${roomId}`);
        res.json({
            room: {
                id: room.id,
                hostId: room.hostId,
                players: room.getAllPlayers(),
                settings: room.settings,
                status: room.status,
                currentQuestion: room.currentQuestion,
                quiz: room.quiz ? {
                    id: room.quiz._id,
                    title: room.quiz.title,
                    category: room.quiz.category,
                    questionCount: room.quiz.questions.length
                } : null
            }
        });
    } catch (error) {
        logger.error({ message: `Error getting room status for room ${req.params.roomId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

export const getActiveRooms = async (req, res) => {
    logger.info("Fetching active rooms");
    try {
        const rooms = [];
        activeRooms.forEach((room, roomId) => {
            if (room.status === "waiting") {
                rooms.push({
                    id: roomId,
                    hostName: room.players.get(room.hostId)?.name || "Unknown",
                    playerCount: room.getPlayerCount(),
                    maxPlayers: room.settings.maxPlayers,
                    quizTitle: room.quiz?.title || "Unknown Quiz",
                    createdAt: room.createdAt
                });
            }
        });

        logger.info(`Successfully fetched ${rooms.length} active rooms`);
        res.json({ rooms });
    } catch (error) {
        logger.error({ message: "Error getting active rooms", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
