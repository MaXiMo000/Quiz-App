import DailyChallenge from "../models/DailyChallenge.js";
import Tournament from "../models/Tournament.js";
import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import logger from "../utils/logger.js";

// ===================== DAILY CHALLENGES =====================

// Get current daily challenge
export const getCurrentDailyChallenge = async (req, res) => {
    logger.info(`Getting current daily challenge for user ${req.user.id}`);
    try {
        const now = new Date();
        const userId = req.user.id;
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find ALL active challenges (don't filter by user completion yet)
        let allActiveChallenges = await DailyChallenge.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate("quizzes");


        // Filter challenges based on user participation and 24-hour reset logic
        const availableChallenges = allActiveChallenges.filter(challenge => {
            const userParticipant = challenge.participants.find(p =>
                p.user.toString() === userId
            );

            // If user hasn't participated, challenge is available
            if (!userParticipant) {
                return true;
            }

            // If user participated but didn't complete, challenge is available
            if (!userParticipant.completed) {
                return true;
            }

            // If user completed but it was more than 24 hours ago, challenge is available again
            if (userParticipant.completed && userParticipant.completedAt) {
                const isMoreThan24HoursAgo = userParticipant.completedAt < twentyFourHoursAgo;
                if (isMoreThan24HoursAgo) {
                    return true;
                }
                return false; // Recently completed, not available
            }

            return false;
        });


        // If no challenges exist and user is admin, suggest creating one
        if (availableChallenges.length === 0) {
            logger.info(`No daily challenges available for user ${userId}`);
            if (req.user.role === "admin") {
                return res.status(404).json({
                    message: "No daily challenges available today",
                    suggestion: "As an admin, you can create a new daily challenge!"
                });
            } else {
                return res.status(404).json({
                    message: "No daily challenges available today",
                    suggestion: "Check back later for new challenges!"
                });
            }
        }

        // Get user's progress for each available challenge
        const challengesWithProgress = availableChallenges.map(challenge => {
            const userProgress = challenge.participants.find(p =>
                p.user.toString() === userId
            );

            // If user completed more than 24 hours ago, reset their progress data for display
            let displayProgress = userProgress;
            let wasReset = false;
            if (userProgress && userProgress.completed && userProgress.completedAt < twentyFourHoursAgo) {
                displayProgress = {
                    progress: 0,
                    completed: false,
                    attempts: 0,
                    completedQuizzes: [],
                    quizScores: []
                };
                wasReset = true;
            }

            return {
                ...challenge.toObject(),
                userProgress: displayProgress || {
                    progress: 0,
                    completed: false,
                    attempts: 0,
                    completedQuizzes: [],
                    quizScores: []
                },
                wasReset: wasReset
            };
        });

        logger.info(`Successfully fetched ${challengesWithProgress.length} daily challenges for user ${userId}`);
        res.json({
            challenges: challengesWithProgress
        });

    } catch (error) {
        logger.error({ message: `Error getting daily challenges for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Join daily challenge
export const joinDailyChallenge = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to join daily challenge ${req.params.challengeId}`);
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId}`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        if (!challenge.isActive) {
            logger.warn(`User ${userId} attempted to join inactive challenge ${challengeId}`);
            return res.status(400).json({ message: "Challenge is not active" });
        }

        const now = new Date();
        if (now < challenge.startDate || now > challenge.endDate) {
            logger.warn(`User ${userId} attempted to join challenge ${challengeId} outside of its active time range`);
            return res.status(400).json({ message: "Challenge is not available" });
        }

        // Check if already participating and handle 24-hour reset logic
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const existingParticipant = challenge.participants.find(p =>
            p.user.toString() === userId
        );

        if (existingParticipant) {
            // If user completed more than 24 hours ago, reset their participation
            if (existingParticipant.completed && existingParticipant.completedAt &&
                existingParticipant.completedAt < twentyFourHoursAgo) {

                logger.info(`Resetting participation for user ${userId} in challenge "${challenge.title}"`);

                // Preserve old results in historical completions
                if (!challenge.historicalCompletions) {
                    challenge.historicalCompletions = [];
                }
                challenge.historicalCompletions.push({
                    user: existingParticipant.user,
                    completedAt: existingParticipant.completedAt,
                    progress: existingParticipant.progress,
                    attempts: existingParticipant.attempts,
                    completedQuizzes: existingParticipant.completedQuizzes,
                    quizScores: existingParticipant.quizScores,
                    resetAt: new Date()
                });

                // Update historical completion stats
                if (!challenge.stats.totalHistoricalCompletions) {
                    challenge.stats.totalHistoricalCompletions = 0;
                }
                challenge.stats.totalHistoricalCompletions += 1;

                // Reset participant data
                existingParticipant.progress = 0;
                existingParticipant.completed = false;
                existingParticipant.completedAt = null;
                existingParticipant.attempts = 0;
                existingParticipant.completedQuizzes = [];
                existingParticipant.quizScores = [];

                // Update user's daily challenge data
                await UserQuiz.findByIdAndUpdate(userId, {
                    $pull: { "gamification.dailyChallenges.completed": challengeId },
                    $set: { "gamification.dailyChallenges.current": challengeId }
                });

            } else if (existingParticipant.completed) {
                logger.warn(`User ${userId} attempted to join recently completed challenge ${challengeId}`);
                return res.status(400).json({
                    message: "Challenge completed recently. Please wait 24 hours before attempting again.",
                    nextAvailableTime: new Date(existingParticipant.completedAt.getTime() + 24 * 60 * 60 * 1000)
                });
            } else {
                logger.warn(`User ${userId} attempted to join challenge ${challengeId} they are already participating in`);
                return res.status(400).json({ message: "Already participating in this challenge" });
            }
        }

        // Add participant only if they don't exist
        if (!existingParticipant) {
            challenge.participants.push({
                user: userId,
                progress: 0,
                completed: false,
                attempts: 0,
                completedQuizzes: [], // Initialize empty array for completed quizzes
                quizScores: [] // Initialize empty array for quiz scores
            });
            challenge.stats.totalParticipants += 1;
        }

        await challenge.save();

        // Update user's current daily challenge
        await UserQuiz.findByIdAndUpdate(userId, {
            "gamification.dailyChallenges.current": challengeId
        });

        logger.info(`User ${userId} successfully joined daily challenge ${challengeId}`);
        res.json({
            message: "Successfully joined daily challenge",
            challenge: challenge
        });

    } catch (error) {
        logger.error({ message: `Error joining daily challenge ${req.params.challengeId} for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Update challenge progress
export const updateChallengeProgress = async (req, res) => {
    logger.info(`User ${req.user.id} updating progress for challenge ${req.params.challengeId}`);
    try {
        const { challengeId } = req.params;
        const { progress, quizScore, timeSpent } = req.body;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId} when updating progress`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        const participantIndex = challenge.participants.findIndex(p =>
            p.user.toString() === userId
        );

        if (participantIndex === -1) {
            logger.warn(`User ${userId} not participating in challenge ${challengeId} when updating progress`);
            return res.status(400).json({ message: "Not participating in this challenge" });
        }

        const participant = challenge.participants[participantIndex];
        participant.attempts += 1;

        // Calculate progress based on challenge type
        let newProgress = 0;
        let isCompleted = false;

        switch (challenge.type) {
            case "quiz_completion":
                newProgress = Math.min(100, (participant.attempts / challenge.parameters.quizCount) * 100);
                isCompleted = participant.attempts >= challenge.parameters.quizCount;
                break;

            case "score_target":
                if (quizScore >= challenge.parameters.targetScore) {
                    newProgress = 100;
                    isCompleted = true;
                }
                break;

            case "speed_challenge":
                if (timeSpent <= challenge.parameters.timeLimit) {
                    newProgress = 100;
                    isCompleted = true;
                }
                break;

            default:
                newProgress = progress || 0;
        }

        participant.progress = newProgress;

        // If challenge completed
        if (isCompleted && !participant.completed) {
            participant.completed = true;
            participant.completedAt = new Date();

            // Award rewards
            const user = await UserQuiz.findById(userId);
            user.xp += challenge.rewards.xp;
            user.totalXP += challenge.rewards.xp;

            if (!user.badges) {
                user.badges = [];
            }
            if (challenge.rewards.badge && !user.badges.includes(challenge.rewards.badge)) {
                user.badges.push(challenge.rewards.badge);
            }

            if (challenge.rewards.theme && !user.unlockedThemes.includes(challenge.rewards.theme)) {
                user.unlockedThemes.push(challenge.rewards.theme);
            }

            // Update daily challenge streak
            const now = new Date();
            const lastCompleted = user.gamification?.dailyChallenges?.lastCompleted;
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            if (lastCompleted && new Date(lastCompleted).toDateString() === yesterday.toDateString()) {
                user.gamification.dailyChallenges.streak += 1;
            } else {
                user.gamification.dailyChallenges.streak = 1;
            }

            user.gamification.dailyChallenges.lastCompleted = now;
            user.gamification.dailyChallenges.completed.push(challengeId);

            await user.save();

            // Update challenge stats
            challenge.stats.completionRate = (challenge.participants.filter(p => p.completed).length / challenge.participants.length) * 100;
            logger.info(`User ${userId} completed challenge ${challengeId}`);
        }

        await challenge.save();

        logger.info(`Successfully updated progress for user ${userId} in challenge ${challengeId}`);
        res.json({
            message: isCompleted ? "Challenge completed!" : "Progress updated",
            participant: participant,
            isCompleted: isCompleted,
            rewards: isCompleted ? challenge.rewards : null
        });

    } catch (error) {
        logger.error({ message: `Error updating challenge progress for user ${req.user.id} in challenge ${req.params.challengeId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Create daily challenge (admin only)
export const createDailyChallenge = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to create a daily challenge`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to create a daily challenge`);
            return res.status(403).json({ message: "Only admins can create daily challenges" });
        }

        const {
            title,
            description,
            type,
            parameters,
            rewards,
            startDate,
            endDate,
            quizzes,  // Add quizzes field
            timeLimit
        } = req.body;


        // Validate required fields
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const challenge = new DailyChallenge({
            title,
            description: description || "Daily challenge",
            type: type || "quiz",
            parameters: parameters || {},
            rewards: rewards || { xp: 100 },
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            quizzes: quizzes || [],  // Include quizzes array
            timeLimit: timeLimit || 300,  // Default 5 minutes
            isActive: true,
            participants: [],  // Initialize participants array
            stats: {
                totalParticipants: 0,
                completedParticipants: 0,
                averageScore: 0,
                completionRate: 0
            }
        });

        await challenge.save();

        logger.info(`Admin ${req.user.id} successfully created daily challenge ${challenge._id}`);
        res.status(201).json({
            message: "Daily challenge created successfully",
            challenge
        });

    } catch (error) {
        logger.error({ message: `Error creating daily challenge by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Create sample daily challenge for testing (admin only)
export const createSampleDailyChallenge = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to create a sample daily challenge`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to create a sample daily challenge`);
            return res.status(403).json({ message: "Only admins can create daily challenges" });
        }

        // Get some sample quizzes for the challenge (remove isActive filter)
        const availableQuizzes = await Quiz.find({}).limit(3);

        if (availableQuizzes.length === 0) {
            // Create a sample quiz if none exist
            logger.info("No sample quizzes found, creating one for the daily challenge");
            const sampleQuiz = new Quiz({
                title: "Sample Quiz for Daily Challenge",
                description: "A sample quiz created for testing daily challenges",
                questions: [
                    {
                        question: "What is the capital of France?",
                        options: ["London", "Berlin", "Paris", "Madrid"],
                        correctAnswer: 2,
                        points: 10,
                        explanation: "Paris is the capital city of France."
                    },
                    {
                        question: "Which planet is known as the Red Planet?",
                        options: ["Venus", "Mars", "Jupiter", "Saturn"],
                        correctAnswer: 1,
                        points: 10,
                        explanation: "Mars is called the Red Planet due to its reddish appearance."
                    },
                    {
                        question: "What is 2 + 2?",
                        options: ["3", "4", "5", "6"],
                        correctAnswer: 1,
                        points: 10,
                        explanation: "2 + 2 equals 4."
                    }
                ],
                isActive: true,
                createdBy: req.user.id,
                category: "General Knowledge"
            });

            await sampleQuiz.save();
            availableQuizzes.push(sampleQuiz);
        }

        // Create a sample challenge without checking for existing ones (for testing)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1); // 24 hours from now

        const sampleChallenge = new DailyChallenge({
            title: "Quiz Master Challenge",
            description: "Complete 3 quizzes to earn bonus XP and unlock special rewards!",
            type: "quiz_completion",
            parameters: {
                quizCount: availableQuizzes.length
            },
            quizzes: availableQuizzes.map(quiz => quiz._id),
            timeLimit: 300, // 5 minutes per quiz
            rewards: {
                xp: 200,
                badge: "Daily Champion",
                theme: "Golden Theme"
            },
            startDate,
            endDate,
            isActive: true
        });

        await sampleChallenge.save();

        logger.info(`Admin ${req.user.id} successfully created sample daily challenge ${sampleChallenge._id}`);
        res.status(201).json({
            message: "Sample daily challenge created successfully",
            challenge: sampleChallenge
        });

    } catch (error) {
        logger.error({ message: `Error creating sample daily challenge by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== TOURNAMENTS =====================

// Get available tournaments
export const getAvailableTournaments = async (req, res) => {
    logger.info(`Getting available tournaments for user ${req.user.id}`);
    try {
        const now = new Date();
        const userId = req.user.id;
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

        // Find tournaments that are active and not completed by the user
        const tournaments = await Tournament.find({
            $and: [
                {
                    $or: [
                        { status: "upcoming" },
                        { status: "registration_open" },
                        { status: "in_progress" }
                    ]
                },
                // Exclude tournaments that are completed or ended more than 2 days ago
                {
                    $or: [
                        { status: { $ne: "completed" } },
                        { tournamentEnd: { $gte: twoDaysAgo } }
                    ]
                }
            ]
        })
        .populate("createdBy", "name email")
        .populate("quizzes") // Populate quizzes to show count
        .sort({ tournamentStart: 1 });

        // Filter out tournaments where user has already completed participation
        const activeTournaments = tournaments.filter(tournament => {
            const userParticipation = tournament.participants.find(p =>
                p.user.toString() === userId
            );

            // Include tournament if:
            // 1. User hasn't participated yet, OR
            // 2. User participated but tournament is still active and not completed
            if (!userParticipation) {
                return true; // User hasn't joined yet
            }

            // If tournament is completed or ended more than 2 days ago, exclude it
            if (tournament.status === "completed" || tournament.tournamentEnd < twoDaysAgo) {
                return false;
            }

            return true; // Tournament is still active
        });

        // Add user progress data to each tournament
        const tournamentsWithProgress = activeTournaments.map(tournament => {
            const userParticipation = tournament.participants.find(p =>
                p.user.toString() === userId
            );


            return {
                ...tournament.toObject(),
                userProgress: userParticipation || null,
                isUserParticipating: !!userParticipation,
                quizCount: tournament.quizzes?.length || 0
            };
        });

        logger.info(`Successfully fetched ${tournamentsWithProgress.length} available tournaments for user ${userId}`);
        res.json({ tournaments: tournamentsWithProgress });

    } catch (error) {
        logger.error({ message: `Error getting available tournaments for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Delete daily challenge (admin only)
export const deleteDailyChallenge = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to delete daily challenge ${req.params.challengeId}`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to delete daily challenge ${req.params.challengeId}`);
            return res.status(403).json({ message: "Only admins can delete daily challenges" });
        }

        const { challengeId } = req.params;
        const challenge = await DailyChallenge.findById(challengeId);

        if (!challenge) {
            logger.warn(`Daily challenge not found for deletion: ${challengeId}`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        await DailyChallenge.findByIdAndDelete(challengeId);

        logger.info(`Admin ${req.user.id} successfully deleted daily challenge ${challengeId}`);
        res.json({
            message: "Daily challenge deleted successfully"
        });

    } catch (error) {
        logger.error({ message: `Error deleting daily challenge ${req.params.challengeId} by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Delete tournament (admin only)
export const deleteTournament = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to delete tournament ${req.params.tournamentId}`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to delete tournament ${req.params.tournamentId}`);
            return res.status(403).json({ message: "Only admins can delete tournaments" });
        }

        const { tournamentId } = req.params;
        const tournament = await Tournament.findById(tournamentId);

        if (!tournament) {
            logger.warn(`Tournament not found for deletion: ${tournamentId}`);
            return res.status(404).json({ message: "Tournament not found" });
        }

        await Tournament.findByIdAndDelete(tournamentId);

        logger.info(`Admin ${req.user.id} successfully deleted tournament ${tournamentId}`);
        res.json({
            message: "Tournament deleted successfully"
        });

    } catch (error) {
        logger.error({ message: `Error deleting tournament ${req.params.tournamentId} by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get available quizzes for challenges/tournaments (admin only)
export const getAvailableQuizzes = async (req, res) => {
    logger.info(`Admin ${req.user.id} fetching available quizzes for challenges/tournaments`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to fetch available quizzes`);
            return res.status(403).json({ message: "Only admins can access this endpoint" });
        }

        // Get all quizzes (remove isActive filter since it might not exist in your Quiz model)
        const quizzes = await Quiz.find({})
            .select("title description category difficulty questions createdBy")
            .populate("createdBy", "name")
            .sort({ createdAt: -1 }); // Sort by newest first

        logger.info(`Admin ${req.user.id} successfully fetched ${quizzes.length} available quizzes`);
        res.json({ quizzes });

    } catch (error) {
        logger.error({ message: `Error fetching available quizzes by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Register for tournament
export const registerForTournament = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to register for tournament ${req.params.tournamentId}`);
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            logger.warn(`Tournament not found: ${tournamentId} for registration`);
            return res.status(404).json({ message: "Tournament not found" });
        }

        const now = new Date();

        // More flexible date comparison - check if we're within the registration period
        const regStart = new Date(tournament.registrationStart);
        const regEnd = new Date(tournament.registrationEnd);

        // Check if registration is open (considering full days rather than exact times)
        if (now < regStart || now > regEnd) {
            logger.warn(`User ${userId} attempted to register for tournament ${tournamentId} outside of registration period`);
            return res.status(400).json({
                message: "Registration is not open",
                registrationStart: regStart,
                registrationEnd: regEnd,
                currentTime: now
            });
        }

        if (tournament.participants.length >= tournament.settings.maxParticipants) {
            logger.warn(`User ${userId} attempted to register for full tournament ${tournamentId}`);
            return res.status(400).json({ message: "Tournament is full" });
        }

        // Check if already registered
        const isRegistered = tournament.participants.some(p =>
            p.user.toString() === userId
        );

        if (isRegistered) {
            logger.warn(`User ${userId} attempted to register for tournament ${tournamentId} again`);
            return res.status(400).json({ message: "Already registered for this tournament" });
        }

        // Check entry fee
        const user = await UserQuiz.findById(userId);
        if (tournament.settings.entryFee > 0 && user.xp < tournament.settings.entryFee) {
            logger.warn(`User ${userId} has insufficient XP for tournament ${tournamentId}`);
            return res.status(400).json({ message: "Insufficient XP for entry fee" });
        }

        // Deduct entry fee
        if (tournament.settings.entryFee > 0) {
            user.xp -= tournament.settings.entryFee;
            await user.save();
        }

        // Add participant
        tournament.participants.push({
            user: userId,
            registeredAt: new Date(),
            currentScore: 0,
            totalTime: 0,
            quizzesCompleted: 0,
            rank: 0,
            completedQuizzes: [], // Initialize empty array for completed quizzes
            quizScores: [] // Initialize empty array for quiz scores
        });

        tournament.stats.totalParticipants += 1;
        await tournament.save();

        // Update user's tournament list
        await UserQuiz.findByIdAndUpdate(userId, {
            $push: { "gamification.tournaments.participating": tournamentId },
            $inc: { "gamification.tournaments.totalParticipations": 1 }
        });

        logger.info(`User ${userId} successfully registered for tournament ${tournamentId}`);
        res.json({
            message: "Successfully registered for tournament",
            tournament: tournament
        });

    } catch (error) {
        logger.error({ message: `Error registering user ${req.user.id} for tournament ${req.params.tournamentId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get tournament leaderboard
export const getTournamentLeaderboard = async (req, res) => {
    logger.info(`Fetching leaderboard for tournament ${req.params.tournamentId}`);
    try {
        const { tournamentId } = req.params;

        const tournament = await Tournament.findById(tournamentId)
            .populate("participants.user", "name email level");

        if (!tournament) {
            logger.warn(`Tournament not found: ${tournamentId} when fetching leaderboard`);
            return res.status(404).json({ message: "Tournament not found" });
        }

        // Sort participants by score and time
        const leaderboard = tournament.participants
            .filter(p => !p.eliminated)
            .sort((a, b) => {
                if (a.currentScore !== b.currentScore) {
                    return b.currentScore - a.currentScore; // Higher score first
                }
                return a.totalTime - b.totalTime; // Lower time first
            })
            .map((participant, index) => ({
                rank: index + 1,
                user: participant.user,
                score: participant.currentScore,
                totalTime: participant.totalTime,
                quizzesCompleted: participant.quizzesCompleted
            }));

        logger.info(`Successfully fetched leaderboard for tournament ${tournamentId}`);
        res.json({
            tournament: {
                name: tournament.name,
                status: tournament.status,
                settings: tournament.settings
            },
            leaderboard
        });

    } catch (error) {
        logger.error({ message: `Error getting tournament leaderboard for tournament ${req.params.tournamentId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Update tournament score
export const updateTournamentScore = async (req, res) => {
    logger.info(`User ${req.user.id} updating score for tournament ${req.params.tournamentId}`);
    try {
        const { tournamentId } = req.params;
        const { score, timeSpent } = req.body;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            logger.warn(`Tournament not found: ${tournamentId} when updating score`);
            return res.status(404).json({ message: "Tournament not found" });
        }

        if (tournament.status !== "in_progress") {
            logger.warn(`User ${userId} attempted to update score for tournament ${tournamentId} that is not in progress`);
            return res.status(400).json({ message: "Tournament is not in progress" });
        }

        const participantIndex = tournament.participants.findIndex(p =>
            p.user.toString() === userId
        );

        if (participantIndex === -1) {
            logger.warn(`User ${userId} not registered for tournament ${tournamentId} when updating score`);
            return res.status(400).json({ message: "Not registered for this tournament" });
        }

        const participant = tournament.participants[participantIndex];
        participant.currentScore += score;
        participant.totalTime += timeSpent;
        participant.quizzesCompleted += 1;

        await tournament.save();

        // Update rankings
        const sortedParticipants = tournament.participants
            .filter(p => !p.eliminated)
            .sort((a, b) => {
                if (a.currentScore !== b.currentScore) {
                    return b.currentScore - a.currentScore;
                }
                return a.totalTime - b.totalTime;
            });

        sortedParticipants.forEach((participant, index) => {
            participant.rank = index + 1;
        });

        await tournament.save();

        logger.info(`Successfully updated score for user ${userId} in tournament ${tournamentId}`);
        res.json({
            message: "Score updated successfully",
            participant: participant,
            currentRank: participant.rank
        });

    } catch (error) {
        logger.error({ message: `Error updating tournament score for user ${req.user.id} in tournament ${req.params.tournamentId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Create tournament (admin only)
export const createTournament = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to create a tournament`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to create a tournament`);
            return res.status(403).json({ message: "Only admins can create tournaments" });
        }

        const tournamentData = req.body;


        // Ensure dates are properly converted
        if (tournamentData.registrationStart) {
            tournamentData.registrationStart = new Date(tournamentData.registrationStart);
        }
        if (tournamentData.registrationEnd) {
            tournamentData.registrationEnd = new Date(tournamentData.registrationEnd);
        }
        if (tournamentData.tournamentStart) {
            tournamentData.tournamentStart = new Date(tournamentData.tournamentStart);
        }
        if (tournamentData.tournamentEnd) {
            tournamentData.tournamentEnd = new Date(tournamentData.tournamentEnd);
        }

        // Ensure required fields are set
        tournamentData.createdBy = req.user.id;
        tournamentData.status = "registration_open";
        tournamentData.participants = tournamentData.participants || [];
        tournamentData.quizzes = tournamentData.quizzes || [];

        // Initialize stats if not provided
        if (!tournamentData.stats) {
            tournamentData.stats = {
                totalParticipants: 0,
                completedParticipants: 0,
                averageScore: 0,
                completionRate: 0
            };
        }

        const tournament = new Tournament(tournamentData);
        await tournament.save();

        logger.info(`Admin ${req.user.id} successfully created tournament ${tournament._id}`);
        res.status(201).json({
            message: "Tournament created successfully",
            tournament
        });

    } catch (error) {
        logger.error({ message: `Error creating tournament by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Create sample tournament for testing (admin only)
export const createSampleTournament = async (req, res) => {
    logger.info(`Admin ${req.user.id} attempting to create a sample tournament`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to create a sample tournament`);
            return res.status(403).json({ message: "Only admins can create tournaments" });
        }

        // Get some sample quizzes for the tournament (remove isActive filter)
        let availableQuizzes = await Quiz.find({}).limit(5);

        if (availableQuizzes.length === 0) {
            // Create sample quizzes if none exist
            logger.info("No sample quizzes found, creating some for the tournament");
            const sampleQuizzes = [];
            for (let i = 1; i <= 3; i++) {
                const sampleQuiz = new Quiz({
                    title: `Tournament Quiz ${i}`,
                    description: `Sample quiz ${i} created for tournament testing`,
                    questions: [
                        {
                            question: `Tournament Question ${i}-1: What is ${i} + ${i}?`,
                            options: [`${i*2-1}`, `${i*2}`, `${i*2+1}`, `${i*2+2}`],
                            correctAnswer: 1,
                            points: 10,
                            explanation: `${i} + ${i} equals ${i*2}.`
                        },
                        {
                            question: `Tournament Question ${i}-2: Which number comes after ${i*10}?`,
                            options: [`${i*10+1}`, `${i*10+2}`, `${i*10+3}`, `${i*10+4}`],
                            correctAnswer: 0,
                            points: 10,
                            explanation: `${i*10+1} comes after ${i*10}.`
                        }
                    ],
                    isActive: true,
                    createdBy: req.user.id,
                    category: "Tournament Practice"
                });

                await sampleQuiz.save();
                sampleQuizzes.push(sampleQuiz);
            }
            availableQuizzes = sampleQuizzes;
        }

        // Create a sample tournament with immediate registration
        const now = new Date();
        const registrationStart = new Date(now);
        const registrationEnd = new Date(now);
        registrationEnd.setDate(registrationEnd.getDate() + 1); // Registration open for 1 day

        const tournamentStart = new Date(now);
        tournamentStart.setHours(tournamentStart.getHours() + 2); // Start in 2 hours

        const tournamentEnd = new Date(tournamentStart);
        tournamentEnd.setHours(tournamentEnd.getHours() + 4); // 4 hour tournament

        const sampleTournament = new Tournament({
            name: "Sample Tournament - Test Your Skills!",
            description: "A sample tournament to test the functionality. Compete with others!",
            type: "elimination",
            category: "General Knowledge",
            settings: {
                maxParticipants: 50,
                quizCount: availableQuizzes.length,
                timeLimit: 300,
                difficulty: "medium",
                entryFee: 0,
                duration: 4
            },
            quizzes: availableQuizzes.map(quiz => quiz._id),
            prizes: {
                first: { xp: 500, badge: "Tournament Champion", theme: "Victory Gold" },
                second: { xp: 300, badge: "Runner Up", theme: "Silver Crown" },
                third: { xp: 200, badge: "Bronze Medal" }
            },
            registrationStart,
            registrationEnd,
            tournamentStart,
            tournamentEnd,
            status: "registration_open",
            createdBy: req.user.id,
            participants: [],
            stats: {
                totalParticipants: 0,
                averageScore: 0,
                completionRate: 0
            }
        });

        await sampleTournament.save();

        logger.info(`Admin ${req.user.id} successfully created sample tournament ${sampleTournament._id}`);
        res.status(201).json({
            message: "Sample tournament created successfully",
            tournament: sampleTournament
        });

    } catch (error) {
        logger.error({ message: `Error creating sample tournament by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Start challenge quiz
export const startChallengeQuiz = async (req, res) => {
    logger.info(`User ${req.user.id} starting quiz for challenge ${req.params.challengeId}`);
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId).populate("quizzes");
        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId} when starting quiz`);
            return res.status(404).json({ message: "Challenge not found" });
        }


        // Check if challenge has any quizzes
        if (!challenge.quizzes || challenge.quizzes.length === 0) {
            logger.warn(`Challenge ${challengeId} has no quizzes configured`);
            return res.status(400).json({ message: "This challenge has no quizzes configured" });
        }

        // Check if user is participating
        const participant = challenge.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            logger.warn(`User ${userId} not participating in challenge ${challengeId} when starting quiz`);
            return res.status(400).json({ message: "You must join the challenge first" });
        }

        // Get next quiz for the user
        const completedQuizzes = participant.completedQuizzes || [];
        const availableQuizzes = challenge.quizzes.filter(quiz =>
            !completedQuizzes.includes(quiz._id.toString())
        );


        if (availableQuizzes.length === 0) {
            logger.info(`User ${userId} has no more quizzes available in challenge ${challengeId}`);
            return res.status(400).json({ message: "No more quizzes available in this challenge" });
        }

        const nextQuiz = availableQuizzes[0];

        logger.info(`Successfully started quiz ${nextQuiz._id} for user ${userId} in challenge ${challengeId}`);
        res.json({
            quiz: {
                _id: nextQuiz._id,
                title: nextQuiz.title,
                questions: nextQuiz.questions,
                timeLimit: challenge.timeLimit || 300
            },
            challengeProgress: {
                completed: completedQuizzes.length,
                total: challenge.quizzes.length,
                remaining: availableQuizzes.length
            }
        });

    } catch (error) {
        logger.error({ message: `Error starting challenge quiz for user ${req.user.id} in challenge ${req.params.challengeId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Submit challenge quiz
export const submitChallengeQuiz = async (req, res) => {
    logger.info(`User ${req.user.id} submitting quiz ${req.body.quizId} for challenge ${req.params.challengeId}`);
    try {
        const { challengeId } = req.params;
        const { quizId, answers, timeSpent, timeTaken } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;


        const challenge = await DailyChallenge.findById(challengeId).populate("quizzes");
        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId} when submitting quiz`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        const participant = challenge.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            logger.warn(`User ${userId} not participating in challenge ${challengeId} when submitting quiz`);
            return res.status(400).json({ message: "Not participating in this challenge" });
        }

        const quiz = challenge.quizzes.find(q => q._id.toString() === quizId);
        if (!quiz) {
            logger.warn(`Quiz ${quizId} not found in challenge ${challengeId}`);
            return res.status(400).json({ message: "Quiz not found in this challenge" });
        }

        // Calculate score from answers (don't overwrite the score from frontend)
        let calculatedScore = 0;
        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;


        quiz.questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const correctAnswer = question.correctAnswer;
            const questionPoints = question.points || 10; // Default 10 points per question

            // Handle both number and letter format answers
            let isCorrect = false;
            if (typeof correctAnswer === "string" && typeof userAnswer === "number") {
                // Convert letter answer (A, B, C, D) to number (0, 1, 2, 3)
                const letterToNumber = { "A": 0, "B": 1, "C": 2, "D": 3 };
                isCorrect = userAnswer === letterToNumber[correctAnswer];
            } else if (typeof correctAnswer === "number" && typeof userAnswer === "string") {
                // Convert number answer to letter format
                const numberToLetter = { 0: "A", 1: "B", 2: "C", 3: "D" };
                isCorrect = numberToLetter[userAnswer] === correctAnswer;
            } else {
                // Same type comparison
                isCorrect = userAnswer === correctAnswer;
            }


            if (isCorrect) {
                correctAnswers++;
                calculatedScore += questionPoints;
            }
        });

        // Use the calculated score (don't rely on frontend score as it might be 0)
        const finalScore = calculatedScore;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;


        // Update participant progress
        if (!participant.completedQuizzes) {
            participant.completedQuizzes = [];
        }

        if (!participant.quizScores) {
            participant.quizScores = [];
        }

        participant.completedQuizzes.push(quizId);
        participant.quizScores.push({
            quizId,
            score: finalScore,
            percentage,
            timeSpent: actualTimeSpent,
            completedAt: new Date()
        });


        // Update participant attempts
        participant.attempts += 1;

        // Update overall progress
        const completedCount = participant.completedQuizzes.length;
        const totalQuizzes = challenge.quizzes.length;
        participant.progress = (completedCount / totalQuizzes) * 100;

        // Check if challenge is completed
        if (completedCount >= totalQuizzes) {
            participant.completed = true;
            participant.completedAt = new Date();

            // Update challenge completion statistics
            challenge.stats.completedParticipants = (challenge.stats.completedParticipants || 0) + 1;
            challenge.stats.completionRate = (challenge.stats.completedParticipants / challenge.stats.totalParticipants) * 100;

            // Award rewards
            const user = await UserQuiz.findById(userId);
            user.xp += challenge.rewards.xp;
            user.totalXP += challenge.rewards.xp;

            if (challenge.rewards.badge && !user.badges.includes(challenge.rewards.badge)) {
                user.badges.push(challenge.rewards.badge);
            }

            await user.save();
            logger.info(`User ${userId} completed challenge ${challengeId} and received rewards`);
        }

        await challenge.save();

        logger.info(`Successfully submitted quiz ${quizId} for user ${userId} in challenge ${challengeId}`);
        res.json({
            message: completedCount >= totalQuizzes ? "Challenge completed!" : "Quiz submitted successfully",
            results: {
                score: finalScore,
                percentage,
                correctAnswers,
                totalQuestions,
                timeSpent: actualTimeSpent
            },
            challengeProgress: {
                completed: completedCount,
                total: totalQuizzes,
                isCompleted: completedCount >= totalQuizzes,
                progress: participant.progress
            },
            participantData: {
                progress: participant.progress,
                completed: participant.completed,
                attempts: participant.attempts,
                quizScores: participant.quizScores
            },
            rewards: completedCount >= totalQuizzes ? challenge.rewards : null
        });

    } catch (error) {
        logger.error({ message: `Error submitting challenge quiz for user ${req.user.id} in challenge ${req.params.challengeId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Start tournament quiz
export const startTournamentQuiz = async (req, res) => {
    logger.info(`User ${req.user.id} starting quiz for tournament ${req.params.tournamentId}`);
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId).populate("quizzes");
        if (!tournament) {
            logger.warn(`Tournament not found: ${tournamentId} when starting quiz`);
            return res.status(404).json({ message: "Tournament not found" });
        }


        // Check if tournament has any quizzes
        if (!tournament.quizzes || tournament.quizzes.length === 0) {
            logger.warn(`Tournament ${tournamentId} has no quizzes configured`);
            return res.status(400).json({ message: "This tournament has no quizzes configured" });
        }

        if (tournament.status !== "in_progress") {
            logger.warn(`User ${userId} attempted to start quiz for tournament ${tournamentId} that is not in progress`);
            return res.status(400).json({ message: "Tournament is not in progress" });
        }

        const participant = tournament.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            logger.warn(`User ${userId} not registered for tournament ${tournamentId} when starting quiz`);
            return res.status(400).json({ message: "You must register for the tournament first" });
        }

        // Get next quiz for the user
        const completedQuizzes = participant.completedQuizzes || [];
        const availableQuizzes = tournament.quizzes.filter(quiz =>
            !completedQuizzes.includes(quiz._id.toString())
        );


        if (availableQuizzes.length === 0) {
            logger.info(`User ${userId} has no more quizzes available in tournament ${tournamentId}`);
            return res.status(400).json({ message: "No more quizzes available in this tournament" });
        }

        const nextQuiz = availableQuizzes[0];

        logger.info(`Successfully started quiz ${nextQuiz._id} for user ${userId} in tournament ${tournamentId}`);
        res.json({
            quiz: {
                _id: nextQuiz._id,
                title: nextQuiz.title,
                questions: nextQuiz.questions,
                timeLimit: tournament.settings?.timeLimit || 300
            },
            tournamentProgress: {
                completed: completedQuizzes.length,
                total: tournament.quizzes.length,
                remaining: availableQuizzes.length
            }
        });

    } catch (error) {
        logger.error({ message: `Error starting tournament quiz for user ${req.user.id} in tournament ${req.params.tournamentId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Submit tournament quiz
export const submitTournamentQuiz = async (req, res) => {
    logger.info(`User ${req.user.id} submitting quiz ${req.body.quizId} for tournament ${req.params.tournamentId}`);
    try {
        const { tournamentId } = req.params;
        const { quizId, answers, timeSpent, timeTaken } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;


        const tournament = await Tournament.findById(tournamentId).populate("quizzes");
        if (!tournament) {
            logger.warn(`Tournament not found: ${tournamentId} when submitting quiz`);
            return res.status(404).json({ message: "Tournament not found" });
        }

        const participant = tournament.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            logger.warn(`User ${userId} not registered for tournament ${tournamentId} when submitting quiz`);
            return res.status(400).json({ message: "Not registered for this tournament" });
        }

        const quiz = tournament.quizzes.find(q => q._id.toString() === quizId);
        if (!quiz) {
            logger.warn(`Quiz ${quizId} not found in tournament ${tournamentId}`);
            return res.status(400).json({ message: "Quiz not found in this tournament" });
        }

        // Calculate score from answers (don't overwrite the score from frontend)
        let calculatedScore = 0;
        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;


        quiz.questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const correctAnswer = question.correctAnswer;
            const questionPoints = question.points || 10; // Default 10 points per question

            // Handle both number and letter format answers
            let isCorrect = false;
            if (typeof correctAnswer === "string" && typeof userAnswer === "number") {
                // Convert letter answer (A, B, C, D) to number (0, 1, 2, 3)
                const letterToNumber = { "A": 0, "B": 1, "C": 2, "D": 3 };
                isCorrect = userAnswer === letterToNumber[correctAnswer];
            } else if (typeof correctAnswer === "number" && typeof userAnswer === "string") {
                // Convert number answer to letter format
                const numberToLetter = { 0: "A", 1: "B", 2: "C", 3: "D" };
                isCorrect = numberToLetter[userAnswer] === correctAnswer;
            } else {
                // Same type comparison
                isCorrect = userAnswer === correctAnswer;
            }


            if (isCorrect) {
                correctAnswers++;
                calculatedScore += questionPoints;
            }
        });

        // Use the calculated score (don't rely on frontend score as it might be 0)
        const finalScore = calculatedScore;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;


        // Update participant progress
        if (!participant.completedQuizzes) {
            participant.completedQuizzes = [];
        }

        if (!participant.quizScores) {
            participant.quizScores = [];
        }

        participant.completedQuizzes.push(quizId);
        participant.quizScores.push({
            quizId,
            score: finalScore,
            percentage,
            timeSpent: actualTimeSpent,
            completedAt: new Date()
        });


        // Update tournament stats
        participant.currentScore += finalScore;
        participant.totalTime += actualTimeSpent;
        participant.quizzesCompleted = participant.completedQuizzes.length;

        await tournament.save();

        logger.info("Debug - Tournament saved, final participant state:", {
            currentScore: participant.currentScore,
            totalTime: participant.totalTime,
            quizzesCompleted: participant.quizzesCompleted,
            completedQuizzes: participant.completedQuizzes.length,
            quizScores: participant.quizScores.length
        });

        res.json({
            message: "Quiz submitted successfully",
            results: {
                score: finalScore,
                percentage,
                correctAnswers,
                totalQuestions,
                timeSpent: actualTimeSpent
            },
            tournamentProgress: {
                completed: participant.completedQuizzes.length,
                total: tournament.quizzes.length,
                currentScore: participant.currentScore,
                totalTime: participant.totalTime,
                progress: (participant.completedQuizzes.length / tournament.quizzes.length) * 100
            },
            participantData: {
                currentScore: participant.currentScore,
                totalTime: participant.totalTime,
                quizzesCompleted: participant.quizzesCompleted,
                quizScores: participant.quizScores
            }
        });

    } catch (error) {
        logger.error({ message: `Error submitting tournament quiz for user ${req.user.id} in tournament ${req.params.tournamentId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== HISTORY ENDPOINTS =====================

// Get user's challenge history
export const getUserCompletedChallenges = async (req, res) => {
    logger.info(`Getting completed challenges for user ${req.user.id}`);
    try {
        const userId = req.user.id;

        // Find all challenges where user actually completed them (not just joined)
        const challenges = await DailyChallenge.find({
            "participants": {
                $elemMatch: {
                    "user": userId,
                    "completed": true  // Only completed challenges
                }
            }
        }).sort({ endDate: -1 }).limit(20);


        // Extract user's specific data for each completed challenge
        const challengeHistory = challenges.map(challenge => {
            const userParticipation = challenge.participants.find(p =>
                p.user.toString() === userId && p.completed === true // Double check completion
            );

            // Skip if no valid completed participation found
            if (!userParticipation || !userParticipation.completed) {
                logger.warn(`No valid participation found for challenge ${challenge.title}`);
                return null;
            }


            return {
                _id: challenge._id,
                title: challenge.title,
                description: challenge.description,
                type: challenge.type,
                rewards: challenge.rewards,
                endDate: challenge.endDate,
                createdAt: challenge.createdAt,
                progress: userParticipation.progress || 0,
                completed: userParticipation.completed,
                completedAt: userParticipation.completedAt,
                attempts: userParticipation.attempts || 0,
                quizScores: userParticipation.quizScores || []
            };
        }).filter(challenge => challenge !== null); // Remove null entries

        logger.info(`Successfully fetched ${challengeHistory.length} completed challenges for user ${userId}`);
        res.json({ challenges: challengeHistory });

    } catch (error) {
        logger.error({ message: `Error getting completed challenges for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's tournament history
export const getTournamentHistory = async (req, res) => {
    logger.info(`Getting tournament history for user ${req.user.id}`);
    try {
        const userId = req.user.id;

        // Find all tournaments where user participated (including completed active ones)
        const tournaments = await Tournament.find({
            "participants.user": userId,
            $or: [
                { status: "completed" }, // Completed tournaments
                {
                    "participants.quizzesCompleted": { $gt: 0 },
                    "participants.user": userId
                } // Active tournaments where user has completed quizzes
            ]
        }).sort({ tournamentEnd: -1 }).limit(20);


        // Extract user's specific data for each tournament
        const tournamentHistory = tournaments.map(tournament => {
            const userParticipation = tournament.participants.find(p =>
                p.user.toString() === userId
            );

            logger.debug("Debug - User tournament participation:", {
                tournamentId: tournament._id,
                currentScore: userParticipation?.currentScore,
                quizzesCompleted: userParticipation?.quizzesCompleted,
                quizScores: userParticipation?.quizScores?.length
            });

            // Calculate user's rank based on score
            const sortedParticipants = tournament.participants
                .filter(p => p.currentScore > 0)
                .sort((a, b) => b.currentScore - a.currentScore);

            const userRank = sortedParticipants.findIndex(p =>
                p.user.toString() === userId
            ) + 1;

            return {
                _id: tournament._id,
                title: tournament.name, // Tournament model uses 'name' field
                description: tournament.description,
                type: tournament.type,
                category: tournament.category,
                prizes: tournament.prizes,
                endDate: tournament.tournamentEnd,
                createdAt: tournament.createdAt,
                userBestScore: userParticipation?.currentScore || 0,
                userRank: userRank || null,
                quizzesCompleted: userParticipation?.quizzesCompleted || 0,
                totalTime: userParticipation?.totalTime || 0,
                quizScores: userParticipation?.quizScores || [],
                stats: tournament.stats
            };
        });

        logger.info(`Successfully fetched ${tournamentHistory.length} tournament history records for user ${userId}`);
        res.json({ tournaments: tournamentHistory });

    } catch (error) {
        logger.error({ message: `Error getting tournament history for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up challenges with no quizzes (admin only)
export const cleanupEmptyChallenges = async (req, res) => {
    logger.info(`Admin ${req.user.id} starting cleanup of empty challenges`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to cleanup empty challenges`);
            return res.status(403).json({ message: "Only admins can cleanup challenges" });
        }

        // Find challenges with no quizzes
        const emptyChallenges = await DailyChallenge.find({
            $or: [
                { quizzes: { $exists: false } },
                { quizzes: { $size: 0 } }
            ]
        });


        // Delete empty challenges
        for (const challenge of emptyChallenges) {
            await DailyChallenge.findByIdAndDelete(challenge._id);
        }

        logger.info(`Admin ${req.user.id} cleaned up ${emptyChallenges.length} empty challenges`);
        res.json({
            message: `Cleaned up ${emptyChallenges.length} empty challenges`,
            deletedCount: emptyChallenges.length
        });

    } catch (error) {
        logger.error({ message: `Error cleaning up empty challenges by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up tournaments with no quizzes (admin only)
export const cleanupEmptyTournaments = async (req, res) => {
    logger.info(`Admin ${req.user.id} starting cleanup of empty tournaments`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to cleanup empty tournaments`);
            return res.status(403).json({ message: "Only admins can cleanup tournaments" });
        }

        // Find tournaments with no quizzes
        const emptyTournaments = await Tournament.find({
            $or: [
                { quizzes: { $exists: false } },
                { quizzes: { $size: 0 } }
            ]
        });


        // Delete empty tournaments
        for (const tournament of emptyTournaments) {
            await Tournament.findByIdAndDelete(tournament._id);
        }

        logger.info(`Admin ${req.user.id} cleaned up ${emptyTournaments.length} empty tournaments`);
        res.json({
            message: `Cleaned up ${emptyTournaments.length} empty tournaments`,
            deletedCount: emptyTournaments.length
        });

    } catch (error) {
        logger.error({ message: `Error cleaning up empty tournaments by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== DAILY CHALLENGE RESET SYSTEM =====================

// Reset daily challenges after 24 hours (automatic system)
export const resetDailyChallenges = async () => {
    logger.info("Starting daily challenge reset system");
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        logger.info(`Looking for challenges completed before ${twentyFourHoursAgo.toISOString()}`);

        // Find challenges where users completed them more than 24 hours ago
        const challengesToReset = await DailyChallenge.find({
            "participants.completed": true,
            "participants.completedAt": { $lt: twentyFourHoursAgo },
            isActive: true // Only reset active challenges
        });

        logger.info(`Found ${challengesToReset.length} challenges with participants to reset`);

        let totalUsersReset = 0;
        let challengesModified = 0;

        for (const challenge of challengesToReset) {
            let challengeModified = false;
            let usersResetInChallenge = 0;

            // Reset individual participants who completed more than 24 hours ago
            for (let i = 0; i < challenge.participants.length; i++) {
                const participant = challenge.participants[i];

                if (participant.completed &&
                    participant.completedAt &&
                    participant.completedAt < twentyFourHoursAgo) {

                    // Preserve old results in historical completions
                    if (!challenge.historicalCompletions) {
                        challenge.historicalCompletions = [];
                    }
                    challenge.historicalCompletions.push({
                        user: participant.user,
                        completedAt: participant.completedAt,
                        progress: participant.progress,
                        attempts: participant.attempts,
                        completedQuizzes: participant.completedQuizzes,
                        quizScores: participant.quizScores,
                        resetAt: new Date()
                    });

                    // Update historical completion stats
                    if (!challenge.stats.totalHistoricalCompletions) {
                        challenge.stats.totalHistoricalCompletions = 0;
                    }
                    challenge.stats.totalHistoricalCompletions += 1;

                    // Reset participant data
                    challenge.participants[i] = {
                        user: participant.user,
                        progress: 0,
                        completed: false,
                        completedAt: null,
                        attempts: 0,
                        completedQuizzes: [],
                        quizScores: []
                    };

                    usersResetInChallenge++;
                    challengeModified = true;

                    // Also update user's dailyChallenges data
                    await UserQuiz.findByIdAndUpdate(participant.user, {
                        $pull: { "gamification.dailyChallenges.completed": challenge._id },
                        $set: { "gamification.dailyChallenges.current": challenge._id }
                    });

                    logger.info(`Reset user ${participant.user} in challenge "${challenge.title}"`);
                }
            }

            if (challengeModified) {
                // Recalculate challenge statistics
                const completedParticipants = challenge.participants.filter(p => p.completed).length;
                challenge.stats.completionRate = challenge.participants.length > 0
                    ? (completedParticipants / challenge.participants.length) * 100
                    : 0;

                await challenge.save();
                challengesModified++;
                totalUsersReset += usersResetInChallenge;

                logger.info(`Reset ${usersResetInChallenge} users in challenge "${challenge.title}"`);
            }
        }

        logger.info(`Daily reset completed: ${totalUsersReset} users reset across ${challengesModified} challenges`);

        return {
            success: true,
            usersReset: totalUsersReset,
            challengesModified: challengesModified,
            timestamp: now
        };

    } catch (error) {
        logger.error({ message: "Error in daily challenge reset system", error: error.message, stack: error.stack });
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};

// Manual reset endpoint for testing (admin only)
export const manualResetDailyChallenges = async (req, res) => {
    logger.warn(`Admin ${req.user.id} manually triggered daily challenge reset`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to manually reset daily challenges`);
            return res.status(403).json({ message: "Only admins can manually reset challenges" });
        }

        const result = await resetDailyChallenges();

        if (result.success) {
            logger.info(`Manual daily challenge reset completed successfully by admin ${req.user.id}`);
            res.json({
                message: "Daily challenge reset completed successfully",
                usersReset: result.usersReset,
                challengesModified: result.challengesModified,
                timestamp: result.timestamp
            });
        } else {
            logger.error({ message: `Manual daily challenge reset failed for admin ${req.user.id}`, error: result.error });
            res.status(500).json({
                message: "Error during reset",
                error: result.error,
                timestamp: result.timestamp
            });
        }

    } catch (error) {
        logger.error({ message: `Error in manual daily challenge reset by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Check if a challenge should be available for a user (considering reset logic)
export const isChallengeAvailableForUser = async (challengeId, userId) => {
    try {
        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge || !challenge.isActive) {
            return false;
        }

        const now = new Date();

        // Check if challenge period is active
        if (now < challenge.startDate || now > challenge.endDate) {
            return false;
        }

        // Find user's participation
        const participant = challenge.participants.find(p =>
            p.user.toString() === userId
        );

        // If user hasn't participated yet, challenge is available
        if (!participant) {
            return true;
        }

        // If user completed but it was more than 24 hours ago, it should be available
        if (participant.completed && participant.completedAt) {
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            if (participant.completedAt < twentyFourHoursAgo) {
                return true; // Should be reset and available
            }
            return false; // Recently completed, not available
        }

        // If user started but didn't complete, it's available
        return true;

    } catch (error) {
        logger.error({ message: `Error checking challenge availability for user ${userId} and challenge ${challengeId}`, error: error.message, stack: error.stack });
        return false;
    }
};

// Get historical challenge completions for a user
export const getUserChallengeHistory = async (req, res) => {
    logger.info(`Getting user challenge history for user ${req.user.id} and challenge ${req.params.challengeId}`);
    try {
        const userId = req.user.id;
        const { challengeId } = req.params;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId} when getting user challenge history`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        // Get user's historical completions for this challenge
        const userHistory = (challenge.historicalCompletions || []).filter(h =>
            h.user.toString() === userId
        );

        // Get current participation if exists
        const currentParticipation = challenge.participants.find(p =>
            p.user.toString() === userId
        );

        logger.info(`Successfully fetched user challenge history for user ${userId} and challenge ${challengeId}`);
        res.json({
            challengeId: challengeId,
            challengeTitle: challenge.title,
            currentParticipation: currentParticipation,
            historicalCompletions: userHistory,
            totalAttempts: userHistory.length + (currentParticipation?.completed ? 1 : 0)
        });

    } catch (error) {
        logger.error({ message: `Error getting user challenge history for user ${req.user.id} and challenge ${req.params.challengeId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get all historical completions for a challenge (admin only)
export const getChallengeHistoryAdmin = async (req, res) => {
    logger.info(`Admin ${req.user.id} getting challenge history for challenge ${req.params.challengeId}`);
    try {
        if (req.user.role !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to get challenge history for challenge ${req.params.challengeId}`);
            return res.status(403).json({ message: "Admin access required" });
        }

        const { challengeId } = req.params;

        const challenge = await DailyChallenge.findById(challengeId)
            .populate("historicalCompletions.user", "name email")
            .populate("participants.user", "name email");

        if (!challenge) {
            logger.warn(`Challenge not found: ${challengeId} when getting challenge history by admin`);
            return res.status(404).json({ message: "Challenge not found" });
        }

        logger.info(`Successfully fetched challenge history for challenge ${challengeId} by admin ${req.user.id}`);
        res.json({
            challenge: {
                title: challenge.title,
                description: challenge.description,
                totalHistoricalCompletions: challenge.stats.totalHistoricalCompletions,
                currentParticipants: challenge.participants.length,
                historicalCompletions: challenge.historicalCompletions,
                participants: challenge.participants
            }
        });

    } catch (error) {
        logger.error({ message: `Error getting challenge history for challenge ${req.params.challengeId} by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get daily challenge status for a user (enhanced with reset logic)
export const getDailyChallengeStatus = async (req, res) => {
    logger.info(`Getting daily challenge status for user ${req.user.id}`);
    try {
        const userId = req.user.id;
        const now = new Date();

        // Get all active challenges
        const activeChallenges = await DailyChallenge.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate("quizzes");

        const challengeStatuses = [];

        for (const challenge of activeChallenges) {
            const isAvailable = await isChallengeAvailableForUser(challenge._id, userId);
            const participant = challenge.participants.find(p =>
                p.user.toString() === userId
            );

            let status = "available";
            let userProgress = null;

            if (participant) {
                if (participant.completed) {
                    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    if (participant.completedAt && participant.completedAt > twentyFourHoursAgo) {
                        status = "completed_today";
                    } else {
                        status = "available"; // Reset available
                    }
                } else {
                    status = "in_progress";
                }

                // Calculate comprehensive user progress data
                const quizScores = participant.quizScores || [];
                const totalScore = quizScores.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
                const averagePercentage = quizScores.length > 0
                    ? quizScores.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0) / quizScores.length
                    : 0;
                const totalTimeSpent = quizScores.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);

                userProgress = {
                    progress: participant.progress || 0,
                    completed: participant.completed || false,
                    completedAt: participant.completedAt,
                    attempts: participant.attempts || 0,
                    completedQuizzes: participant.completedQuizzes?.length || 0,
                    totalQuizzes: challenge.quizzes?.length || 0,
                    quizScores: quizScores,
                    totalScore: totalScore,
                    averagePercentage: Math.round(averagePercentage * 100) / 100, // Round to 2 decimal places
                    totalTimeSpent: totalTimeSpent
                };
            }

            // Check if this challenge was reset for this user
            let wasReset = false;
            if (participant && participant.completed && participant.completedAt) {
                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                wasReset = participant.completedAt < twentyFourHoursAgo && status === "available";
            }

            challengeStatuses.push({
                ...challenge.toObject(),
                status,
                isAvailable,
                userProgress,
                wasReset,
                nextResetTime: participant?.completedAt ?
                    new Date(participant.completedAt.getTime() + 24 * 60 * 60 * 1000) : null
            });
        }

        logger.info(`Successfully fetched ${challengeStatuses.length} daily challenge statuses for user ${userId}`);
        res.json({
            challenges: challengeStatuses,
            serverTime: now
        });

    } catch (error) {
        logger.error({ message: `Error getting daily challenge status for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up old completed challenge data (admin utility)
export const cleanupOldChallengeData = async (req, res) => {
    logger.info(`Admin ${req.user.id} starting cleanup of old challenge data`);
    try {
        const userRole = req.user.role;
        if (userRole !== "admin") {
            logger.warn(`Non-admin user ${req.user.id} attempted to cleanup old challenge data`);
            return res.status(403).json({ message: "Only admins can cleanup old data" });
        }

        const { daysOld = 30 } = req.query; // Default to 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

        logger.info(`Cleaning up challenge data older than ${daysOld} days (before ${cutoffDate.toISOString()})`);

        // Remove old inactive challenges
        const oldChallenges = await DailyChallenge.find({
            $or: [
                { endDate: { $lt: cutoffDate } },
                { isActive: false, updatedAt: { $lt: cutoffDate } }
            ]
        });

        let deletedChallenges = 0;
        for (const challenge of oldChallenges) {
            await DailyChallenge.findByIdAndDelete(challenge._id);
            deletedChallenges++;
        }

        // Clean up user references to deleted challenges
        await UserQuiz.updateMany(
            {},
            {
                $pull: {
                    "gamification.dailyChallenges.completed": { $in: oldChallenges.map(c => c._id) }
                }
            }
        );

        logger.info(`Cleanup completed: ${deletedChallenges} old challenges removed`);

        res.json({
            message: "Cleanup completed successfully",
            deletedChallenges,
            cutoffDate
        });

    } catch (error) {
        logger.error({ message: `Error in cleanup of old challenge data by admin ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== COMPLETED CHALLENGES & TOURNAMENTS =====================

// Get user's completed daily challenges
export const getCompletedChallenges = async (req, res) => {
    logger.info(`Getting completed daily challenges for user ${req.user.id}`);
    try {
        const userId = req.user.id;
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find challenges where user has completed participation within the last 24 hours
        // This ensures only "recently completed" challenges show up, not reset ones
        const completedChallenges = await DailyChallenge.find({
            "participants.user": userId,
            "participants.completed": true,
            "participants.completedAt": { $gte: twentyFourHoursAgo }, // Only completed within last 24 hours
            isActive: true // Only active challenges
        })
        .populate("quizzes")
        .sort({ "participants.completedAt": -1 });

        logger.info(`Found ${completedChallenges.length} recently completed challenges for user ${userId}`);

        // Filter and format challenges to only include user's completed data
        const userCompletedChallenges = completedChallenges.map(challenge => {
            const userParticipation = challenge.participants.find(p =>
                p.user.toString() === userId &&
                p.completed &&
                p.completedAt >= twentyFourHoursAgo // Double-check the time constraint
            );

            if (!userParticipation) {
                logger.warn(`No valid participation found for challenge ${challenge.title}`);
                return null;
            }

            // Calculate comprehensive stats
            const quizScores = userParticipation.quizScores || [];
            const totalScore = quizScores.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
            const averagePercentage = quizScores.length > 0
                ? quizScores.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0) / quizScores.length
                : 0;
            const totalTimeSpent = quizScores.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);

            logger.info(`Including completed challenge: ${challenge.title} (completed at: ${userParticipation.completedAt})`);

            return {
                _id: challenge._id,
                title: challenge.title,
                description: challenge.description,
                type: challenge.type,
                parameters: challenge.parameters,
                rewards: challenge.rewards,
                startDate: challenge.startDate,
                endDate: challenge.endDate,
                quizzes: challenge.quizzes,
                stats: challenge.stats,
                status: "completed_today", // Add consistent status
                nextResetTime: new Date(userParticipation.completedAt.getTime() + 24 * 60 * 60 * 1000), // When it will reset
                userProgress: {
                    progress: userParticipation.progress || 100, // Should be 100 if completed
                    completed: userParticipation.completed,
                    completedAt: userParticipation.completedAt,
                    attempts: userParticipation.attempts || 0,
                    completedQuizzes: userParticipation.completedQuizzes?.length || 0,
                    totalQuizzes: challenge.quizzes?.length || 0,
                    quizScores: quizScores,
                    totalScore: totalScore,
                    averagePercentage: Math.round(averagePercentage * 100) / 100,
                    totalTimeSpent: totalTimeSpent
                }
            };
        }).filter(Boolean);

        logger.info(`Returning ${userCompletedChallenges.length} completed challenges for display`);

        res.json({
            completedChallenges: userCompletedChallenges,
            total: userCompletedChallenges.length
        });

    } catch (error) {
        logger.error({ message: `Error getting completed challenges for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's completed tournaments
export const getCompletedTournaments = async (req, res) => {
    logger.info(`Getting completed tournaments for user ${req.user.id}`);
    try {
        const userId = req.user.id;
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

        // Find tournaments where user participated and either:
        // 1. Tournament is completed (status = completed)
        // 2. Tournament ended more than 2 days ago
        const completedTournaments = await Tournament.find({
            "participants.user": userId,
            $or: [
                { status: "completed" },
                {
                    tournamentEnd: { $lt: twoDaysAgo },
                    status: { $in: ["completed", "in_progress"] }
                }
            ]
        })
        .populate("quizzes")
        .populate("createdBy", "name email")
        .sort({ tournamentEnd: -1 });

        // Format tournaments to include user's performance data
        const userCompletedTournaments = completedTournaments.map(tournament => {
            const userParticipation = tournament.participants.find(p =>
                p.user.toString() === userId
            );

            if (!userParticipation) return null;

            // Calculate user's final rank if not set
            const sortedParticipants = tournament.participants
                .sort((a, b) => b.currentScore - a.currentScore)
                .map((p, index) => ({ ...p, rank: index + 1 }));

            const userRank = sortedParticipants.find(p => p.user.toString() === userId)?.rank || 0;

            return {
                _id: tournament._id,
                name: tournament.name,
                description: tournament.description,
                category: tournament.category,
                type: tournament.type,
                settings: tournament.settings,
                prizes: tournament.prizes,
                tournamentStart: tournament.tournamentStart,
                tournamentEnd: tournament.tournamentEnd,
                status: tournament.status,
                userPerformance: {
                    registeredAt: userParticipation.registeredAt,
                    finalScore: userParticipation.currentScore,
                    totalTime: userParticipation.totalTime,
                    quizzesCompleted: userParticipation.quizzesCompleted,
                    rank: userRank,
                    eliminated: userParticipation.eliminated,
                    quizScores: userParticipation.quizScores,
                    averagePercentage: userParticipation.quizScores.length > 0
                        ? userParticipation.quizScores.reduce((sum, quiz) => sum + quiz.percentage, 0) / userParticipation.quizScores.length
                        : 0
                },
                quizzes: tournament.quizzes,
                stats: tournament.stats,
                totalParticipants: tournament.participants.length,
                createdBy: tournament.createdBy
            };
        }).filter(Boolean);

        logger.info(`Successfully fetched ${userCompletedTournaments.length} completed tournaments for user ${userId}`);
        res.json({
            completedTournaments: userCompletedTournaments,
            total: userCompletedTournaments.length
        });

    } catch (error) {
        logger.error({ message: `Error getting completed tournaments for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
