import DailyChallenge from "../models/DailyChallenge.js";
import Tournament from "../models/Tournament.js";
import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

// ===================== DAILY CHALLENGES =====================

// Get current daily challenge
const _getCurrentDailyChallenge = async (req, res) => {
    try {
        const now = new Date();
        const userId = req.user.id;
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find ALL active challenges (don't filter by user completion yet)
        let allActiveChallenges = await DailyChallenge.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate('quizzes');


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
            if (req.user.role === 'admin') {
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


        res.json({
            challenges: challengesWithProgress
        });

    } catch (error) {
        logger.error("Error getting daily challenges", { 
            context: 'GamificationController', 
            operation: 'Get Current Daily Challenge',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getCurrentDailyChallenge = withCachingAndLogging(_getCurrentDailyChallenge, {
    ...controllerConfigs.gamification,
    operation: 'Get Current Daily Challenge',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `daily-challenges:${req.user?.id}`
});

// Join daily challenge
const _joinDailyChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        if (!challenge.isActive) {
            return res.status(400).json({ message: "Challenge is not active" });
        }

        const now = new Date();
        if (now < challenge.startDate || now > challenge.endDate) {
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
                
                logger.info("Resetting participation for user in challenge", {
                    context: 'GamificationController',
                    operation: 'Reset Daily Challenges',
                    userId,
                    challengeTitle: challenge.title
                });
                
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
                    $pull: { 'gamification.dailyChallenges.completed': challengeId },
                    $set: { 'gamification.dailyChallenges.current': challengeId }
                });
                
            } else if (existingParticipant.completed) {
                return res.status(400).json({ 
                    message: "Challenge completed recently. Please wait 24 hours before attempting again.",
                    nextAvailableTime: new Date(existingParticipant.completedAt.getTime() + 24 * 60 * 60 * 1000)
                });
            } else {
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

        res.json({
            message: "Successfully joined daily challenge",
            challenge: challenge
        });

    } catch (error) {
        logger.error("Error joining daily challenge", { 
            context: 'GamificationController', 
            operation: 'Join Daily Challenge',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const joinDailyChallenge = withCachingAndLogging(_joinDailyChallenge, {
    ...controllerConfigs.gamification,
    operation: 'Join Daily Challenge',
    cacheTTL: 0, // No caching for join operations
    logFields: ['params.challengeId']
});

// Update challenge progress
const _updateChallengeProgress = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { progress, quizScore, timeSpent } = req.body;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        const participantIndex = challenge.participants.findIndex(p => 
            p.user.toString() === userId
        );

        if (participantIndex === -1) {
            return res.status(400).json({ message: "Not participating in this challenge" });
        }

        const participant = challenge.participants[participantIndex];
        participant.attempts += 1;

        // Calculate progress based on challenge type
        let newProgress = 0;
        let isCompleted = false;

        switch (challenge.type) {
            case 'quiz_completion':
                newProgress = Math.min(100, (participant.attempts / challenge.parameters.quizCount) * 100);
                isCompleted = participant.attempts >= challenge.parameters.quizCount;
                break;
                
            case 'score_target':
                if (quizScore >= challenge.parameters.targetScore) {
                    newProgress = 100;
                    isCompleted = true;
                }
                break;
                
            case 'speed_challenge':
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
        }

        await challenge.save();

        res.json({
            message: isCompleted ? "Challenge completed!" : "Progress updated",
            participant: participant,
            isCompleted: isCompleted,
            rewards: isCompleted ? challenge.rewards : null
        });

    } catch (error) {
        logger.error("Error updating challenge progress", { 
            context: 'GamificationController', 
            operation: 'Update Challenge Progress',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const updateChallengeProgress = withCachingAndLogging(_updateChallengeProgress, {
    ...controllerConfigs.gamification,
    operation: 'Update Challenge Progress',
    cacheTTL: 0, // No caching for update operations
    logFields: ['params.challengeId', 'body.progress']
});

// Create daily challenge (admin only)
const _createDailyChallenge = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
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


        const challenge = new DailyChallenge({
            title,
            description,
            type,
            parameters,
            rewards,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
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


        res.status(201).json({
            message: "Daily challenge created successfully",
            challenge
        });

    } catch (error) {
        logger.error("Error creating daily challenge", { 
            context: 'GamificationController', 
            operation: 'Create Daily Challenge',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const createDailyChallenge = withCachingAndLogging(_createDailyChallenge, {
    ...controllerConfigs.gamification,
    operation: 'Create Daily Challenge',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.title', 'body.category']
});

// Create sample daily challenge for testing (admin only)
const _createSampleDailyChallenge = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can create daily challenges" });
        }

        // Get some sample quizzes for the challenge (remove isActive filter)
        const availableQuizzes = await Quiz.find({}).limit(3);
        
        if (availableQuizzes.length === 0) {
            // Create a sample quiz if none exist
            
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

        res.status(201).json({
            message: "Sample daily challenge created successfully",
            challenge: sampleChallenge
        });

    } catch (error) {
        logger.error("Error creating sample daily challenge", { 
            context: 'GamificationController', 
            operation: 'Create Sample Daily Challenge',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const createSampleDailyChallenge = withCachingAndLogging(_createSampleDailyChallenge, {
    ...controllerConfigs.gamification,
    operation: 'Create Sample Daily Challenge',
    cacheTTL: 0, // No caching for create operations
    logFields: []
});

// ===================== TOURNAMENTS =====================

// Get available tournaments
const _getAvailableTournaments = async (req, res) => {
    try {
        const now = new Date();
        const userId = req.user.id;
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
        
        // Find tournaments that are active and not completed by the user
        const tournaments = await Tournament.find({
            $and: [
                {
                    $or: [
                        { status: 'upcoming' },
                        { status: 'registration_open' },
                        { status: 'in_progress' }
                    ]
                },
                // Exclude tournaments that are completed or ended more than 2 days ago
                {
                    $or: [
                        { status: { $ne: 'completed' } },
                        { tournamentEnd: { $gte: twoDaysAgo } }
                    ]
                }
            ]
        })
        .populate('createdBy', 'name email')
        .populate('quizzes') // Populate quizzes to show count
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
            if (tournament.status === 'completed' || tournament.tournamentEnd < twoDaysAgo) {
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

        res.json({ tournaments: tournamentsWithProgress });

    } catch (error) {
        logger.error("Error getting tournaments", { 
            context: 'GamificationController', 
            operation: 'Get Available Tournaments',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getAvailableTournaments = withCachingAndLogging(_getAvailableTournaments, {
    ...controllerConfigs.gamification,
    operation: 'Get Available Tournaments',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `available-tournaments:${req.user?.id}`
});

// Delete daily challenge (admin only)
const _deleteDailyChallenge = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can delete daily challenges" });
        }

        const { challengeId } = req.params;
        const challenge = await DailyChallenge.findById(challengeId);
        
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        await DailyChallenge.findByIdAndDelete(challengeId);

        res.json({
            message: "Daily challenge deleted successfully"
        });

    } catch (error) {
        logger.error("Error deleting daily challenge", { 
            context: 'GamificationController', 
            operation: 'Delete Daily Challenge',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteDailyChallenge = withCachingAndLogging(_deleteDailyChallenge, {
    ...controllerConfigs.gamification,
    operation: 'Delete Daily Challenge',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['params.challengeId']
});

// Delete tournament (admin only)
const _deleteTournament = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can delete tournaments" });
        }

        const { tournamentId } = req.params;
        const tournament = await Tournament.findById(tournamentId);
        
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        await Tournament.findByIdAndDelete(tournamentId);

        res.json({
            message: "Tournament deleted successfully"
        });

    } catch (error) {
        logger.error("Error deleting tournament", { 
            context: 'GamificationController', 
            operation: 'Delete Tournament',
            tournamentId: req.params.tournamentId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteTournament = withCachingAndLogging(_deleteTournament, {
    ...controllerConfigs.gamification,
    operation: 'Delete Tournament',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['params.tournamentId']
});

// Get available quizzes for challenges/tournaments (admin only)
const _getAvailableQuizzes = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can access this endpoint" });
        }

        // Get all quizzes (remove isActive filter since it might not exist in your Quiz model)
        const quizzes = await Quiz.find({})
            .select('title description category difficulty questions createdBy')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 }); // Sort by newest first


        res.json({ quizzes });

    } catch (error) {
        logger.error("Error fetching quizzes", { 
            context: 'GamificationController', 
            operation: 'Get Available Quizzes',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getAvailableQuizzes = withCachingAndLogging(_getAvailableQuizzes, {
    ...controllerConfigs.gamification,
    operation: 'Get Available Quizzes',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `available-quizzes:${req.user?.id}`
});

// Register for tournament
const _registerForTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const now = new Date();
        
        // More flexible date comparison - check if we're within the registration period
        const regStart = new Date(tournament.registrationStart);
        const regEnd = new Date(tournament.registrationEnd);
        
        // Check if registration is open (considering full days rather than exact times)
        if (now < regStart || now > regEnd) {
            return res.status(400).json({ 
                message: "Registration is not open",
                registrationStart: regStart,
                registrationEnd: regEnd,
                currentTime: now
            });
        }

        if (tournament.participants.length >= tournament.settings.maxParticipants) {
            return res.status(400).json({ message: "Tournament is full" });
        }

        // Check if already registered
        const isRegistered = tournament.participants.some(p => 
            p.user.toString() === userId
        );

        if (isRegistered) {
            return res.status(400).json({ message: "Already registered for this tournament" });
        }

        // Check entry fee
        const user = await UserQuiz.findById(userId);
        if (tournament.settings.entryFee > 0 && user.xp < tournament.settings.entryFee) {
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

        res.json({
            message: "Successfully registered for tournament",
            tournament: tournament
        });

    } catch (error) {
        logger.error("Error registering for tournament", { 
            context: 'GamificationController', 
            operation: 'Register For Tournament',
            tournamentId: req.params.tournamentId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const registerForTournament = withCachingAndLogging(_registerForTournament, {
    ...controllerConfigs.gamification,
    operation: 'Register For Tournament',
    cacheTTL: 0, // No caching for register operations
    logFields: ['params.tournamentId']
});

// Get tournament leaderboard
const _getTournamentLeaderboard = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        
        const tournament = await Tournament.findById(tournamentId)
            .populate('participants.user', 'name email level');

        if (!tournament) {
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

        res.json({
            tournament: {
                name: tournament.name,
                status: tournament.status,
                settings: tournament.settings
            },
            leaderboard
        });

    } catch (error) {
        logger.error("Error getting tournament leaderboard", { 
            context: 'GamificationController', 
            operation: 'Get Tournament Leaderboard',
            tournamentId: req.params.tournamentId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getTournamentLeaderboard = withCachingAndLogging(_getTournamentLeaderboard, {
    ...controllerConfigs.gamification,
    operation: 'Get Tournament Leaderboard',
    cacheTTL: 60, // 1 minute
    cacheKeyGenerator: (req) => `tournament-leaderboard:${req.params.tournamentId}`
});

// Update tournament score
const _updateTournamentScore = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { score, timeSpent } = req.body;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        if (tournament.status !== 'in_progress') {
            return res.status(400).json({ message: "Tournament is not in progress" });
        }

        const participantIndex = tournament.participants.findIndex(p => 
            p.user.toString() === userId
        );

        if (participantIndex === -1) {
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

        res.json({
            message: "Score updated successfully",
            participant: participant,
            currentRank: participant.rank
        });

    } catch (error) {
        logger.error("Error updating tournament score", { 
            context: 'GamificationController', 
            operation: 'Update Tournament Score',
            tournamentId: req.params.tournamentId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const updateTournamentScore = withCachingAndLogging(_updateTournamentScore, {
    ...controllerConfigs.gamification,
    operation: 'Update Tournament Score',
    cacheTTL: 0, // No caching for update operations
    logFields: ['params.tournamentId', 'body.score']
});

// Create tournament (admin only)
const _createTournament = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
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
        tournamentData.status = 'registration_open';
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


        res.status(201).json({
            message: "Tournament created successfully",
            tournament
        });

    } catch (error) {
        logger.error("Error creating tournament", { 
            context: 'GamificationController', 
            operation: 'Create Tournament',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const createTournament = withCachingAndLogging(_createTournament, {
    ...controllerConfigs.gamification,
    operation: 'Create Tournament',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.title', 'body.category']
});

// Create sample tournament for testing (admin only)
const _createSampleTournament = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can create tournaments" });
        }

        // Get some sample quizzes for the tournament (remove isActive filter)
        let availableQuizzes = await Quiz.find({}).limit(5);
        
        if (availableQuizzes.length === 0) {
            // Create sample quizzes if none exist
            
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
            status: 'registration_open',
            createdBy: req.user.id,
            participants: [],
            stats: {
                totalParticipants: 0,
                averageScore: 0,
                completionRate: 0
            }
        });

        await sampleTournament.save();

        res.status(201).json({
            message: "Sample tournament created successfully",
            tournament: sampleTournament
        });

    } catch (error) {
        logger.error("Error creating sample tournament", { 
            context: 'GamificationController', 
            operation: 'Create Sample Tournament',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const createSampleTournament = withCachingAndLogging(_createSampleTournament, {
    ...controllerConfigs.gamification,
    operation: 'Create Sample Tournament',
    cacheTTL: 0, // No caching for create operations
    logFields: []
});

// Start challenge quiz
const _startChallengeQuiz = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId).populate('quizzes');
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }


        // Check if challenge has any quizzes
        if (!challenge.quizzes || challenge.quizzes.length === 0) {
            return res.status(400).json({ message: "This challenge has no quizzes configured" });
        }

        // Check if user is participating
        const participant = challenge.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            return res.status(400).json({ message: "You must join the challenge first" });
        }

        // Get next quiz for the user
        const completedQuizzes = participant.completedQuizzes || [];
        const availableQuizzes = challenge.quizzes.filter(quiz => 
            !completedQuizzes.includes(quiz._id.toString())
        );


        if (availableQuizzes.length === 0) {
            return res.status(400).json({ message: "No more quizzes available in this challenge" });
        }

        const nextQuiz = availableQuizzes[0];

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
        logger.error("Error starting challenge quiz", { 
            context: 'GamificationController', 
            operation: 'Start Challenge Quiz',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const startChallengeQuiz = withCachingAndLogging(_startChallengeQuiz, {
    ...controllerConfigs.gamification,
    operation: 'Start Challenge Quiz',
    cacheTTL: 0, // No caching for start operations
    logFields: ['params.challengeId']
});

// Submit challenge quiz
const _submitChallengeQuiz = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { quizId, answers, timeSpent, timeTaken, score } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;


        const challenge = await DailyChallenge.findById(challengeId).populate('quizzes');
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        const participant = challenge.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            return res.status(400).json({ message: "Not participating in this challenge" });
        }

        const quiz = challenge.quizzes.find(q => q._id.toString() === quizId);
        if (!quiz) {
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
            if (typeof correctAnswer === 'string' && typeof userAnswer === 'number') {
                // Convert letter answer (A, B, C, D) to number (0, 1, 2, 3)
                const letterToNumber = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                isCorrect = userAnswer === letterToNumber[correctAnswer];
            } else if (typeof correctAnswer === 'number' && typeof userAnswer === 'string') {
                // Convert number answer to letter format
                const numberToLetter = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
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
        }

        await challenge.save();


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
        logger.error("Error submitting challenge quiz", { 
            context: 'GamificationController', 
            operation: 'Submit Challenge Quiz',
            challengeId: req.params.challengeId,
            quizId: req.body.quizId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const submitChallengeQuiz = withCachingAndLogging(_submitChallengeQuiz, {
    ...controllerConfigs.gamification,
    operation: 'Submit Challenge Quiz',
    cacheTTL: 0, // No caching for submit operations
    logFields: ['params.challengeId', 'body.quizId', 'body.score']
});

// Start tournament quiz
const _startTournamentQuiz = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId).populate('quizzes');
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }


        // Check if tournament has any quizzes
        if (!tournament.quizzes || tournament.quizzes.length === 0) {
            return res.status(400).json({ message: "This tournament has no quizzes configured" });
        }

        if (tournament.status !== 'in_progress') {
            return res.status(400).json({ message: "Tournament is not in progress" });
        }

        const participant = tournament.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            return res.status(400).json({ message: "You must register for the tournament first" });
        }

        // Get next quiz for the user
        const completedQuizzes = participant.completedQuizzes || [];
        const availableQuizzes = tournament.quizzes.filter(quiz => 
            !completedQuizzes.includes(quiz._id.toString())
        );


        if (availableQuizzes.length === 0) {
            return res.status(400).json({ message: "No more quizzes available in this tournament" });
        }

        const nextQuiz = availableQuizzes[0];

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
        logger.error("Error starting tournament quiz", { 
            context: 'GamificationController', 
            operation: 'Start Tournament Quiz',
            tournamentId: req.params.tournamentId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const startTournamentQuiz = withCachingAndLogging(_startTournamentQuiz, {
    ...controllerConfigs.gamification,
    operation: 'Start Tournament Quiz',
    cacheTTL: 0, // No caching for start operations
    logFields: ['params.tournamentId']
});

// Submit tournament quiz
const _submitTournamentQuiz = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { quizId, answers, timeSpent, timeTaken, score } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;


        const tournament = await Tournament.findById(tournamentId).populate('quizzes');
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        const participant = tournament.participants.find(p => p.user.toString() === userId);
        if (!participant) {
            return res.status(400).json({ message: "Not registered for this tournament" });
        }

        const quiz = tournament.quizzes.find(q => q._id.toString() === quizId);
        if (!quiz) {
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
            if (typeof correctAnswer === 'string' && typeof userAnswer === 'number') {
                // Convert letter answer (A, B, C, D) to number (0, 1, 2, 3)
                const letterToNumber = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                isCorrect = userAnswer === letterToNumber[correctAnswer];
            } else if (typeof correctAnswer === 'number' && typeof userAnswer === 'string') {
                // Convert number answer to letter format
                const numberToLetter = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
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

        logger.debug('Tournament saved, final participant state', {
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
        logger.error("Error submitting tournament quiz", { 
            context: 'GamificationController', 
            operation: 'Submit Tournament Quiz',
            tournamentId: req.params.tournamentId,
            quizId: req.body.quizId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const submitTournamentQuiz = withCachingAndLogging(_submitTournamentQuiz, {
    ...controllerConfigs.gamification,
    operation: 'Submit Tournament Quiz',
    cacheTTL: 0, // No caching for submit operations
    logFields: ['params.tournamentId', 'body.quizId', 'body.score']
});

// ===================== HISTORY ENDPOINTS =====================

// Get user's challenge history
const _getUserCompletedChallenges = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all challenges where user actually completed them (not just joined)
        const challenges = await DailyChallenge.find({
            'participants': {
                $elemMatch: {
                    'user': userId,
                    'completed': true  // Only completed challenges
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
                console.log(`❌ No valid participation found for challenge ${challenge.title}`);
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

        res.json({ challenges: challengeHistory });

    } catch (error) {
        logger.error("Error getting challenge history", { 
            context: 'GamificationController', 
            operation: 'Get User Completed Challenges',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserCompletedChallenges = withCachingAndLogging(_getUserCompletedChallenges, {
    ...controllerConfigs.gamification,
    operation: 'Get User Completed Challenges',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `user-completed-challenges:${req.user?.id}`
});

// Get user's tournament history
const _getTournamentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all tournaments where user participated (including completed active ones)
        const tournaments = await Tournament.find({
            'participants.user': userId,
            $or: [
                { status: 'completed' }, // Completed tournaments
                { 
                    'participants.quizzesCompleted': { $gt: 0 },
                    'participants.user': userId 
                } // Active tournaments where user has completed quizzes
            ]
        }).sort({ tournamentEnd: -1 }).limit(20);


        // Extract user's specific data for each tournament
        const tournamentHistory = tournaments.map(tournament => {
            const userParticipation = tournament.participants.find(p => 
                p.user.toString() === userId
            );
            
            logger.debug('User tournament participation', {
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

        res.json({ tournaments: tournamentHistory });

    } catch (error) {
        logger.error("Error getting tournament history", { 
            context: 'GamificationController', 
            operation: 'Get Tournament History',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getTournamentHistory = withCachingAndLogging(_getTournamentHistory, {
    ...controllerConfigs.gamification,
    operation: 'Get Tournament History',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `tournament-history:${req.user?.id}`
});

// Clean up challenges with no quizzes (admin only)
const _cleanupEmptyChallenges = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
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

        res.json({
            message: `Cleaned up ${emptyChallenges.length} empty challenges`,
            deletedCount: emptyChallenges.length
        });

    } catch (error) {
        logger.error("Error cleaning up challenges", { 
            context: 'GamificationController', 
            operation: 'Cleanup Empty Challenges',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const cleanupEmptyChallenges = withCachingAndLogging(_cleanupEmptyChallenges, {
    ...controllerConfigs.gamification,
    operation: 'Cleanup Empty Challenges',
    cacheTTL: 0, // No caching for cleanup operations
    logFields: []
});

// Clean up tournaments with no quizzes (admin only)
const _cleanupEmptyTournaments = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
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

        res.json({
            message: `Cleaned up ${emptyTournaments.length} empty tournaments`,
            deletedCount: emptyTournaments.length
        });

    } catch (error) {
        logger.error("Error cleaning up tournaments", { 
            context: 'GamificationController', 
            operation: 'Cleanup Empty Tournaments',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const cleanupEmptyTournaments = withCachingAndLogging(_cleanupEmptyTournaments, {
    ...controllerConfigs.gamification,
    operation: 'Cleanup Empty Tournaments',
    cacheTTL: 0, // No caching for cleanup operations
    logFields: []
});

// ===================== DAILY CHALLENGE RESET SYSTEM =====================

// Reset daily challenges after 24 hours (automatic system)
const _resetDailyChallenges = async () => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        logger.info("Starting daily challenge reset", {
            context: 'GamificationController',
            operation: 'Reset Daily Challenges',
            timestamp: now.toISOString(),
            cutoffTime: twentyFourHoursAgo.toISOString()
        });

        // Find challenges where users completed them more than 24 hours ago
        const challengesToReset = await DailyChallenge.find({
            'participants.completed': true,
            'participants.completedAt': { $lt: twentyFourHoursAgo },
            isActive: true // Only reset active challenges
        });

        logger.info("Found challenges to reset", {
            context: 'GamificationController',
            operation: 'Reset Daily Challenges',
            challengesFound: challengesToReset.length
        });

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
                        $pull: { 'gamification.dailyChallenges.completed': challenge._id },
                        $set: { 'gamification.dailyChallenges.current': challenge._id }
                    });
                    
                    logger.info("Reset user in challenge", {
                        context: 'GamificationController',
                        operation: 'Reset Daily Challenges',
                        userId: participant.user,
                        challengeTitle: challenge.title
                    });
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
                
                logger.info("Reset users in challenge", {
                    context: 'GamificationController',
                    operation: 'Reset Daily Challenges',
                    usersReset: usersResetInChallenge,
                    challengeTitle: challenge.title
                });
            }
        }

        logger.info("Daily reset completed", {
            context: 'GamificationController',
            operation: 'Reset Daily Challenges',
            totalUsersReset,
            challengesModified,
            timestamp: now.toISOString()
        });
        
        return {
            success: true,
            usersReset: totalUsersReset,
            challengesModified: challengesModified,
            timestamp: now
        };

    } catch (error) {
        logger.error("Error in daily challenge reset", { 
            context: 'GamificationController', 
            operation: 'Reset Daily Challenges',
            error: error.message 
        });
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};

export const resetDailyChallenges = withCachingAndLogging(_resetDailyChallenges, {
    ...controllerConfigs.gamification,
    operation: 'Reset Daily Challenges',
    cacheTTL: 0, // No caching for reset operations
    logFields: []
});

// Export internal function for server startup
export { _resetDailyChallenges };

// Manual reset endpoint for testing (admin only)
const _manualResetDailyChallenges = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can manually reset challenges" });
        }

        const result = await resetDailyChallenges();

        if (result.success) {
            res.json({
                message: "Daily challenge reset completed successfully",
                usersReset: result.usersReset,
                challengesModified: result.challengesModified,
                timestamp: result.timestamp
            });
        } else {
            res.status(500).json({
                message: "Error during reset",
                error: result.error,
                timestamp: result.timestamp
            });
        }

    } catch (error) {
        logger.error("Error in manual reset", { 
            context: 'GamificationController', 
            operation: 'Manual Reset Daily Challenges',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const manualResetDailyChallenges = withCachingAndLogging(_manualResetDailyChallenges, {
    ...controllerConfigs.gamification,
    operation: 'Manual Reset Daily Challenges',
    cacheTTL: 0, // No caching for reset operations
    logFields: []
});

// Check if a challenge should be available for a user (considering reset logic)
const _isChallengeAvailableForUser = async (challengeId, userId) => {
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
        logger.error("Error checking challenge availability", { 
            context: 'GamificationController', 
            operation: 'Is Challenge Available For User',
            challengeId,
            userId,
            error: error.message 
        });
        return false;
    }
};

export const isChallengeAvailableForUser = withCachingAndLogging(_isChallengeAvailableForUser, {
    ...controllerConfigs.gamification,
    operation: 'Is Challenge Available For User',
    cacheTTL: 60, // 1 minute
    cacheKeyGenerator: (challengeId, userId) => `challenge-availability:${challengeId}:${userId}`
});

// Get historical challenge completions for a user
const _getUserChallengeHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { challengeId } = req.params;

        const challenge = await DailyChallenge.findById(challengeId);
        if (!challenge) {
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

        res.json({
            challengeId: challengeId,
            challengeTitle: challenge.title,
            currentParticipation: currentParticipation,
            historicalCompletions: userHistory,
            totalAttempts: userHistory.length + (currentParticipation?.completed ? 1 : 0)
        });

    } catch (error) {
        logger.error("Error getting user challenge history", { 
            context: 'GamificationController', 
            operation: 'Get User Challenge History',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserChallengeHistory = withCachingAndLogging(_getUserChallengeHistory, {
    ...controllerConfigs.gamification,
    operation: 'Get User Challenge History',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `user-challenge-history:${req.params.challengeId}:${req.user?.id}`
});

// Get all historical completions for a challenge (admin only)
const _getChallengeHistoryAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { challengeId } = req.params;

        const challenge = await DailyChallenge.findById(challengeId)
            .populate('historicalCompletions.user', 'name email')
            .populate('participants.user', 'name email');

        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

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
        logger.error("Error getting challenge history", { 
            context: 'GamificationController', 
            operation: 'Get Challenge History Admin',
            challengeId: req.params.challengeId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getChallengeHistoryAdmin = withCachingAndLogging(_getChallengeHistoryAdmin, {
    ...controllerConfigs.gamification,
    operation: 'Get Challenge History Admin',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `challenge-history-admin:${req.params.challengeId}`
});

// Get daily challenge status for a user (enhanced with reset logic)
const _getDailyChallengeStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // Get all active challenges
        const activeChallenges = await DailyChallenge.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate('quizzes');

        const challengeStatuses = [];

        for (const challenge of activeChallenges) {
            const isAvailable = await isChallengeAvailableForUser(challenge._id, userId);
            const participant = challenge.participants.find(p => 
                p.user.toString() === userId
            );

            let status = 'available';
            let userProgress = null;

            if (participant) {
                if (participant.completed) {
                    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    if (participant.completedAt && participant.completedAt > twentyFourHoursAgo) {
                        status = 'completed_today';
                    } else {
                        status = 'available'; // Reset available
                    }
                } else {
                    status = 'in_progress';
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
                wasReset = participant.completedAt < twentyFourHoursAgo && status === 'available';
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

        res.json({
            challenges: challengeStatuses,
            serverTime: now
        });

    } catch (error) {
        logger.error("Error getting daily challenge status", { 
            context: 'GamificationController', 
            operation: 'Get Daily Challenge Status',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getDailyChallengeStatus = withCachingAndLogging(_getDailyChallengeStatus, {
    ...controllerConfigs.gamification,
    operation: 'Get Daily Challenge Status',
    cacheTTL: 60, // 1 minute
    cacheKeyGenerator: (req) => `daily-challenge-status:${req.user?.id}`
});

// Clean up old completed challenge data (admin utility)
const _cleanupOldChallengeData = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can cleanup old data" });
        }

        const { daysOld = 30 } = req.query; // Default to 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

        console.log(`🧹 Cleaning up challenge data older than ${daysOld} days (before ${cutoffDate.toISOString()})`);

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
                    'gamification.dailyChallenges.completed': { $in: oldChallenges.map(c => c._id) }
                }
            }
        );

        console.log(`✅ Cleanup completed: ${deletedChallenges} old challenges removed`);

        res.json({
            message: "Cleanup completed successfully",
            deletedChallenges,
            cutoffDate
        });

    } catch (error) {
        logger.error("Error in cleanup", { 
            context: 'GamificationController', 
            operation: 'Cleanup Old Challenge Data',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const cleanupOldChallengeData = withCachingAndLogging(_cleanupOldChallengeData, {
    ...controllerConfigs.gamification,
    operation: 'Cleanup Old Challenge Data',
    cacheTTL: 0, // No caching for cleanup operations
    logFields: []
});

// ===================== COMPLETED CHALLENGES & TOURNAMENTS =====================

// Get user's completed daily challenges
const _getCompletedChallenges = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find challenges where user has completed participation within the last 24 hours
        // This ensures only "recently completed" challenges show up, not reset ones
        const completedChallenges = await DailyChallenge.find({
            'participants.user': userId,
            'participants.completed': true,
            'participants.completedAt': { $gte: twentyFourHoursAgo }, // Only completed within last 24 hours
            isActive: true // Only active challenges
        })
        .populate('quizzes')
        .sort({ 'participants.completedAt': -1 });

        console.log(`🔍 Found ${completedChallenges.length} recently completed challenges for user ${userId}`);

        // Filter and format challenges to only include user's completed data
        const userCompletedChallenges = completedChallenges.map(challenge => {
            const userParticipation = challenge.participants.find(p => 
                p.user.toString() === userId && 
                p.completed && 
                p.completedAt >= twentyFourHoursAgo // Double-check the time constraint
            );

            if (!userParticipation) {
                console.log(`❌ No valid participation found for challenge ${challenge.title}`);
                return null;
            }

            // Calculate comprehensive stats
            const quizScores = userParticipation.quizScores || [];
            const totalScore = quizScores.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
            const averagePercentage = quizScores.length > 0 
                ? quizScores.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0) / quizScores.length
                : 0;
            const totalTimeSpent = quizScores.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);

            console.log(`✅ Including completed challenge: ${challenge.title} (completed at: ${userParticipation.completedAt})`);

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
                status: 'completed_today', // Add consistent status
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

        console.log(`📊 Returning ${userCompletedChallenges.length} completed challenges for display`);

        res.json({ 
            completedChallenges: userCompletedChallenges,
            total: userCompletedChallenges.length 
        });

    } catch (error) {
        logger.error("Error getting completed challenges", { 
            context: 'GamificationController', 
            operation: 'Get Completed Challenges',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getCompletedChallenges = withCachingAndLogging(_getCompletedChallenges, {
    ...controllerConfigs.gamification,
    operation: 'Get Completed Challenges',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `completed-challenges:${req.user?.id}`
});

// Get user's completed tournaments
const _getCompletedTournaments = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

        // Find tournaments where user participated and either:
        // 1. Tournament is completed (status = completed)
        // 2. Tournament ended more than 2 days ago
        const completedTournaments = await Tournament.find({
            'participants.user': userId,
            $or: [
                { status: 'completed' },
                { 
                    tournamentEnd: { $lt: twoDaysAgo },
                    status: { $in: ['completed', 'in_progress'] }
                }
            ]
        })
        .populate('quizzes')
        .populate('createdBy', 'name email')
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

        res.json({ 
            completedTournaments: userCompletedTournaments,
            total: userCompletedTournaments.length 
        });

    } catch (error) {
        logger.error("Error getting completed tournaments", { 
            context: 'GamificationController', 
            operation: 'Get Completed Tournaments',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getCompletedTournaments = withCachingAndLogging(_getCompletedTournaments, {
    ...controllerConfigs.gamification,
    operation: 'Get Completed Tournaments',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `completed-tournaments:${req.user?.id}`
});
