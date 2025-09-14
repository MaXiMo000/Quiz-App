import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import Quiz from "../models/Quiz.js";
import CollaborativeSession from "../models/CollaborativeSession.js";
import User from "../models/User.js";
import CollaborativeNote from "../models/CollaborativeNote.js";

const activeSessions = new Map();
const userSockets = new Map();

class CollaborativeQuizSession {
    constructor(id, hostId, quiz, settings) {
        this.id = id;
        this.hostId = hostId;
        this.quiz = quiz;
        this.settings = settings;
        this.players = new Map();
        this.status = "waiting"; // waiting, in_progress, finished
        this.currentQuestion = 0;
        this.suggestions = new Map(); // questionIndex -> [ { answer, suggester, votes: [userId] } ]
        this.groupScore = 0;
        this.whiteboardData = [];
        this.createdAt = new Date();
    }

    addPlayer(userId, userInfo) {
        this.players.set(userId, {
            id: userId,
            ...userInfo,
            connected: true,
        });
    }

    removePlayer(userId) {
        this.players.delete(userId);
    }

    getAllPlayers() {
        return Array.from(this.players.values());
    }

    isHost(userId) {
        return this.hostId === userId;
    }
}

export const initializeCollaborativeQuiz = (server) => {
    const io = new Server(server, {
        path: "/socket.io/collaborative",
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error: Token not provided."));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) {
                return next(new Error("Authentication error: User not found."));
            }
            socket.userId = user._id.toString();
            socket.userInfo = { id: user._id.toString(), name: user.name, avatar: user.name.charAt(0).toUpperCase() };
            userSockets.set(socket.userId, socket.id);
            next();
        } catch (error) {
            next(new Error("Authentication error: Invalid token."));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`User ${socket.userId} connected to collaborative quiz service`);

        socket.on("create_collaborative_room", async ({ quizId, settings }) => {
            try {
                const quiz = await Quiz.findById(quizId);
                if (!quiz) {
                    return socket.emit("error", { message: "Quiz not found" });
                }

                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                const session = new CollaborativeSession({
                    roomId,
                    host: socket.userId,
                    quiz: quizId,
                    players: [socket.userId],
                    settings: settings || {},
                });
                await session.save();

                const quizSession = new CollaborativeQuizSession(roomId, socket.userId, quiz, session.settings);
                quizSession.addPlayer(socket.userId, socket.userInfo);
                activeSessions.set(roomId, quizSession);

                socket.join(roomId);
                socket.currentRoom = roomId;

                socket.emit("collaborative_room_created", { roomId, room: quizSession });
            } catch (error) {
                logger.error(`Error creating collaborative room: ${error.message}`);
                socket.emit("error", { message: "Failed to create room" });
            }
        });

        socket.on("join_collaborative_room", async ({ roomId }) => {
            try {
                const session = activeSessions.get(roomId);
                if (!session) {
                    return socket.emit("error", { message: "Room not found" });
                }
                if (session.status !== "waiting") {
                    return socket.emit("error", { message: "Room is not accepting new players" });
                }

                session.addPlayer(socket.userId, socket.userInfo);
                await CollaborativeSession.updateOne({ roomId }, { $addToSet: { players: socket.userId } });

                socket.join(roomId);
                socket.currentRoom = roomId;

                io.to(roomId).emit("player_joined_collaborative", { player: socket.userInfo, players: session.getAllPlayers() });
                socket.emit("collaborative_room_joined", { room: session });
            } catch (error) {
                logger.error(`Error joining collaborative room: ${error.message}`);
                socket.emit("error", { message: "Failed to join room" });
            }
        });

        socket.on("start_collaborative_quiz", () => {
            const roomId = socket.currentRoom;
            const session = activeSessions.get(roomId);
            if (!session || !session.isHost(socket.userId) || session.status !== "waiting") {
                return socket.emit("error", { message: "Cannot start quiz" });
            }

            session.status = "in_progress";
            startCollaborativeQuestion(session, io);
        });

        socket.on("suggest_answer", ({ answer }) => {
            const roomId = socket.currentRoom;
            const session = activeSessions.get(roomId);
            if (!session || session.status !== "in_progress") return;

            const questionIndex = session.currentQuestion;
            if (!session.suggestions.has(questionIndex)) {
                session.suggestions.set(questionIndex, []);
            }

            const existingSuggestion = session.suggestions.get(questionIndex).find(s => s.answer === answer);
            if (existingSuggestion) {
                if (!existingSuggestion.votes.includes(socket.userId)) {
                    existingSuggestion.votes.push(socket.userId);
                    io.to(roomId).emit("vote_updated", { questionIndex, answer, votes: existingSuggestion.votes.length });
                }
            } else {
                const newSuggestion = {
                    answer,
                    suggester: socket.userId,
                    votes: [socket.userId],
                };
                session.suggestions.get(questionIndex).push(newSuggestion);
                io.to(roomId).emit("new_suggestion", { questionIndex, suggestion: newSuggestion });
            }
        });

        socket.on("whiteboard_draw", (data) => {
            const roomId = socket.currentRoom;
            if(roomId) {
                socket.to(roomId).emit("whiteboard_draw", data);
            }
        });

        socket.on("whiteboard_clear", () => {
            const roomId = socket.currentRoom;
            if(roomId) {
                io.to(roomId).emit("whiteboard_clear");
            }
        });

        socket.on('join_group_notes', ({ groupId }) => {
            socket.join(groupId);
        });

        socket.on('leave_group_notes', ({ groupId }) => {
            socket.leave(groupId);
        });

        socket.on('note_created', async ({ groupId, title, content }) => {
            const note = new CollaborativeNote({
                title,
                content,
                group: groupId,
                createdBy: socket.userId,
            });
            await note.save();
            io.to(groupId).emit('note_created', note);
        });

        socket.on('note_updated', async ({ noteId, content }) => {
            const note = await CollaborativeNote.findByIdAndUpdate(noteId, { content }, { new: true });
            io.to(note.group.toString()).emit('note_updated', note);
        });

        socket.on('note_deleted', async ({ noteId }) => {
            const note = await CollaborativeNote.findByIdAndDelete(noteId);
            io.to(note.group.toString()).emit('note_deleted', noteId);
        });

        socket.on("disconnect", () => {
            const roomId = socket.currentRoom;
            if (roomId) {
                const session = activeSessions.get(roomId);
                if (session) {
                    session.removePlayer(socket.userId);
                    io.to(roomId).emit("player_left_collaborative", { playerId: socket.userId, players: session.getAllPlayers() });
                }
            }
            userSockets.delete(socket.userId);
            logger.info(`User ${socket.userId} disconnected from collaborative quiz service`);
        });
    });

    return io;
};

function startCollaborativeQuestion(session, io) {
    const questionIndex = session.currentQuestion;
    const question = session.quiz.questions[questionIndex];

    if (!question) {
        endCollaborativeQuiz(session, io);
        return;
    }

    const questionData = {
        questionIndex,
        question: {
            question: question.question,
            options: question.options,
        },
        timeLimit: session.settings.timePerQuestion || 30,
    };
    io.to(session.id).emit("new_collaborative_question", questionData);

    setTimeout(() => {
        if (session.status === "in_progress" && session.currentQuestion === questionIndex) {
            nextCollaborativeQuestion(session, io);
        }
    }, (session.settings.timePerQuestion || 30) * 1000);
}

function nextCollaborativeQuestion(session, io) {
    const questionIndex = session.currentQuestion;
    const question = session.quiz.questions[questionIndex];
    const suggestions = session.suggestions.get(questionIndex) || [];

    let groupAnswer = null;
    if (suggestions.length > 0) {
        groupAnswer = suggestions.sort((a, b) => b.votes.length - a.votes.length)[0];
    }

    const isCorrect = groupAnswer && groupAnswer.answer === question.correctAnswer;
    if (isCorrect) {
        session.groupScore += 100; // Example scoring
    }

    io.to(session.id).emit("collaborative_question_result", {
        questionIndex,
        correctAnswer: question.correctAnswer,
        groupAnswer: groupAnswer ? groupAnswer.answer : null,
        isCorrect,
        groupScore: session.groupScore,
    });

    session.currentQuestion++;
    if (session.currentQuestion >= session.quiz.questions.length) {
        setTimeout(() => endCollaborativeQuiz(session, io), 5000);
    } else {
        setTimeout(() => startCollaborativeQuestion(session, io), 5000);
    }
}

async function endCollaborativeQuiz(session, io) {
    session.status = "finished";
    io.to(session.id).emit("collaborative_quiz_finished", {
        groupScore: session.groupScore,
        totalQuestions: session.quiz.questions.length,
    });

    // Update stats for all players in the session
    const xpReward = Math.round(session.groupScore / session.players.size);
    for (const playerId of session.players.keys()) {
        try {
            await User.findByIdAndUpdate(playerId, { $inc: { xp: xpReward, totalXP: xpReward } });
        } catch (error) {
            logger.error(`Failed to update XP for user ${playerId}: ${error.message}`);
        }
    }

    await CollaborativeSession.updateOne({ roomId: session.id }, { status: "finished", score: session.groupScore });

    setTimeout(() => {
        activeSessions.delete(session.id);
    }, 300000); // Clean up after 5 minutes
}

export const createSession = async (quizId, hostId, settings) => {
    // This function is now handled by the socket event 'create_collaborative_room'
    // but we can keep it for potential future RESTful use
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
        throw new Error("Quiz not found");
    }

    const session = new CollaborativeSession({
        host: hostId,
        quiz: quizId,
        players: [hostId],
        settings: settings || {},
        roomId: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    await session.save();
    return session;
};

export const joinSession = async (roomId, userId) => {
    // This function is now handled by the socket event 'join_collaborative_room'
    const session = await CollaborativeSession.findOne({ roomId });
    if (!session) {
        throw new Error("Session not found");
    }

    if (!session.players.includes(userId)) {
        session.players.push(userId);
        await session.save();
    }

    return session;
};

export const handleWhiteboardAction = (roomId, action) => {
    const session = activeSessions.get(roomId);
    if (session) {
        session.whiteboardData.push(action);
        // In a real app, you would probably want to broadcast this to the room
    }
};
