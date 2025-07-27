import DailyChallenge from "../models/DailyChallenge.js";
import Tournament from "../models/Tournament.js";
import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";

// ===================== DAILY CHALLENGES =====================

// Get current daily challenge
export const getCurrentDailyChallenge = async (req, res) => {
    try {
        const now = new Date();
        const userId = req.user.id;

        // Find active challenges that the user hasn't completed yet
        let dailyChallenges = await DailyChallenge.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true,
            $or: [
                { 'participants.user': { $ne: userId } },
                { 
                    'participants.user': userId,
                    'participants.completed': false
                }
            ]
        }).populate('quizzes');

        console.log('Debug - Daily challenges lookup result:', dailyChallenges.length + ' found');
        if (dailyChallenges.length > 0) {
            console.log('Debug - Challenge titles:', dailyChallenges.map(c => c.title));
        }

        // If no challenges exist and user is admin, suggest creating one
        if (dailyChallenges.length === 0) {
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

        // Get user's progress for each challenge
        const challengesWithProgress = dailyChallenges.map(challenge => {
            const userProgress = challenge.participants.find(p => 
                p.user.toString() === userId
            );

            return {
                ...challenge.toObject(),
                userProgress: userProgress || {
                    progress: 0,
                    completed: false,
                    attempts: 0,
                    completedQuizzes: [],
                    quizScores: []
                }
            };
        });

        console.log('Debug - User progress found for challenges:', challengesWithProgress.length);

        res.json({
            challenges: challengesWithProgress
        });

    } catch (error) {
        console.error("Error getting daily challenges:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Join daily challenge
export const joinDailyChallenge = async (req, res) => {
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

        // Check if already participating
        const isParticipating = challenge.participants.some(p => 
            p.user.toString() === userId
        );

        if (isParticipating) {
            return res.status(400).json({ message: "Already participating in this challenge" });
        }

        // Add participant
        challenge.participants.push({
            user: userId,
            progress: 0,
            completed: false,
            attempts: 0,
            completedQuizzes: [], // Initialize empty array for completed quizzes
            quizScores: [] // Initialize empty array for quiz scores
        });

        challenge.stats.totalParticipants += 1;
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
        console.error("Error joining daily challenge:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update challenge progress
export const updateChallengeProgress = async (req, res) => {
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
        console.error("Error updating challenge progress:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create daily challenge (admin only)
export const createDailyChallenge = async (req, res) => {
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

        console.log('Debug - Creating challenge with data:', {
            title,
            quizzesLength: quizzes?.length,
            timeLimit
        });

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

        console.log('Debug - Challenge created with quizzes:', challenge.quizzes.length);

        res.status(201).json({
            message: "Daily challenge created successfully",
            challenge
        });

    } catch (error) {
        console.error("Error creating daily challenge:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create sample daily challenge for testing (admin only)
export const createSampleDailyChallenge = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can create daily challenges" });
        }

        // Get some sample quizzes for the challenge (remove isActive filter)
        const availableQuizzes = await Quiz.find({}).limit(3);
        console.log('Debug - Available quizzes in database:', availableQuizzes.length);
        
        if (availableQuizzes.length === 0) {
            // Create a sample quiz if none exist
            console.log('Debug - No quizzes found, creating a sample quiz...');
            
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
            console.log('Debug - Sample quiz created:', sampleQuiz._id);
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
        console.log('Debug - Sample challenge created with quizzes:', sampleChallenge.quizzes.length);

        res.status(201).json({
            message: "Sample daily challenge created successfully",
            challenge: sampleChallenge
        });

    } catch (error) {
        console.error("Error creating sample daily challenge:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== TOURNAMENTS =====================

// Get available tournaments
export const getAvailableTournaments = async (req, res) => {
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

            console.log('Debug - Tournament user participation:', {
                tournamentId: tournament._id,
                isParticipating: !!userParticipation,
                quizzesCompleted: userParticipation?.quizzesCompleted || 0,
                currentScore: userParticipation?.currentScore || 0
            });

            return {
                ...tournament.toObject(),
                userProgress: userParticipation || null,
                isUserParticipating: !!userParticipation,
                quizCount: tournament.quizzes?.length || 0
            };
        });

        res.json({ tournaments: tournamentsWithProgress });

    } catch (error) {
        console.error("Error getting tournaments:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete daily challenge (admin only)
export const deleteDailyChallenge = async (req, res) => {
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
        console.error("Error deleting daily challenge:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete tournament (admin only)
export const deleteTournament = async (req, res) => {
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
        console.error("Error deleting tournament:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get available quizzes for challenges/tournaments (admin only)
export const getAvailableQuizzes = async (req, res) => {
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

        console.log('Found quizzes:', quizzes.length); // Debug log

        res.json({ quizzes });

    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Register for tournament
export const registerForTournament = async (req, res) => {
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
        console.error("Error registering for tournament:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get tournament leaderboard
export const getTournamentLeaderboard = async (req, res) => {
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
        console.error("Error getting tournament leaderboard:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update tournament score
export const updateTournamentScore = async (req, res) => {
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
        console.error("Error updating tournament score:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create tournament (admin only)
export const createTournament = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can create tournaments" });
        }

        const tournamentData = req.body;
        
        console.log('Debug - Creating tournament with data:', {
            name: tournamentData.name,
            quizzesLength: tournamentData.quizzes?.length,
            settings: tournamentData.settings
        });
        
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

        console.log('Debug - Tournament created with quizzes:', tournament.quizzes.length);

        res.status(201).json({
            message: "Tournament created successfully",
            tournament
        });

    } catch (error) {
        console.error("Error creating tournament:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create sample tournament for testing (admin only)
export const createSampleTournament = async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Only admins can create tournaments" });
        }

        // Get some sample quizzes for the tournament (remove isActive filter)
        let availableQuizzes = await Quiz.find({}).limit(5);
        console.log('Debug - Available quizzes for tournament:', availableQuizzes.length);
        
        if (availableQuizzes.length === 0) {
            // Create sample quizzes if none exist
            console.log('Debug - No quizzes found, creating sample quizzes for tournament...');
            
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
                console.log(`Debug - Tournament quiz ${i} created:`, sampleQuiz._id);
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
        console.log('Debug - Sample tournament created with quizzes:', sampleTournament.quizzes.length);

        res.status(201).json({
            message: "Sample tournament created successfully",
            tournament: sampleTournament
        });

    } catch (error) {
        console.error("Error creating sample tournament:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Start challenge quiz
export const startChallengeQuiz = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const challenge = await DailyChallenge.findById(challengeId).populate('quizzes');
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        console.log('Debug - Challenge found:', challenge.title);
        console.log('Debug - Challenge has quizzes:', challenge.quizzes ? challenge.quizzes.length : 0);

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

        console.log('Debug - Challenge quizzes:', challenge.quizzes.length);
        console.log('Debug - Completed quizzes:', completedQuizzes.length);
        console.log('Debug - Available quizzes:', availableQuizzes.length);

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
        console.error("Error starting challenge quiz:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Submit challenge quiz
export const submitChallengeQuiz = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { quizId, answers, timeSpent, timeTaken, score } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;

        console.log('Debug - Quiz submission data:', {
            quizId,
            answersLength: answers?.length,
            timeSpent: actualTimeSpent,
            frontendScore: score
        });

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

        console.log('Debug - Quiz questions structure:', {
            totalQuestions,
            firstQuestion: quiz.questions[0] ? {
                question: quiz.questions[0].question?.substring(0, 50),
                correctAnswer: quiz.questions[0].correctAnswer,
                points: quiz.questions[0].points,
                options: quiz.questions[0].options?.length
            } : 'No questions'
        });

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
            
            console.log(`Debug - Question ${index + 1}:`, {
                userAnswer,
                correctAnswer,
                userAnswerType: typeof userAnswer,
                correctAnswerType: typeof correctAnswer,
                isCorrect,
                questionPoints
            });
            
            if (isCorrect) {
                correctAnswers++;
                calculatedScore += questionPoints;
            }
        });

        // Use the calculated score (don't rely on frontend score as it might be 0)
        const finalScore = calculatedScore;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        console.log('Debug - Score calculation:', {
            frontendScore: score,
            calculatedScore,
            finalScore,
            correctAnswers,
            totalQuestions,
            percentage
        });

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

        console.log('Debug - Added quiz score:', {
            quizId,
            score: finalScore,
            percentage,
            timeSpent: actualTimeSpent
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

        console.log('Debug - Challenge saved, final participant state:', {
            progress: participant.progress,
            completed: participant.completed,
            attempts: participant.attempts,
            completedQuizzes: participant.completedQuizzes.length,
            quizScores: participant.quizScores.length
        });

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
        console.error("Error submitting challenge quiz:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Start tournament quiz
export const startTournamentQuiz = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.id;

        const tournament = await Tournament.findById(tournamentId).populate('quizzes');
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        console.log('Debug - Tournament found:', tournament.name);
        console.log('Debug - Tournament has quizzes:', tournament.quizzes ? tournament.quizzes.length : 0);
        console.log('Debug - Tournament status:', tournament.status);

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

        console.log('Debug - Tournament quizzes:', tournament.quizzes.length);
        console.log('Debug - Completed quizzes:', completedQuizzes.length);
        console.log('Debug - Available quizzes:', availableQuizzes.length);

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
        console.error("Error starting tournament quiz:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Submit tournament quiz
export const submitTournamentQuiz = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const { quizId, answers, timeSpent, timeTaken, score } = req.body;
        const userId = req.user.id;

        // Handle both timeSpent and timeTaken for compatibility
        const actualTimeSpent = timeSpent || timeTaken || 0;

        console.log('Debug - Tournament quiz submission data:', {
            quizId,
            answersLength: answers?.length,
            timeSpent: actualTimeSpent,
            frontendScore: score
        });

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

        console.log('Debug - Tournament quiz questions structure:', {
            totalQuestions,
            firstQuestion: quiz.questions[0] ? {
                question: quiz.questions[0].question?.substring(0, 50),
                correctAnswer: quiz.questions[0].correctAnswer,
                points: quiz.questions[0].points,
                options: quiz.questions[0].options?.length
            } : 'No questions'
        });

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
            
            console.log(`Debug - Tournament Question ${index + 1}:`, {
                userAnswer,
                correctAnswer,
                userAnswerType: typeof userAnswer,
                correctAnswerType: typeof correctAnswer,
                isCorrect,
                questionPoints
            });
            
            if (isCorrect) {
                correctAnswers++;
                calculatedScore += questionPoints;
            }
        });

        // Use the calculated score (don't rely on frontend score as it might be 0)
        const finalScore = calculatedScore;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        console.log('Debug - Tournament score calculation:', {
            frontendScore: score,
            calculatedScore,
            finalScore,
            correctAnswers,
            totalQuestions,
            percentage
        });

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

        console.log('Debug - Added tournament quiz score:', {
            quizId,
            score: finalScore,
            percentage,
            timeSpent: actualTimeSpent
        });

        // Update tournament stats
        participant.currentScore += finalScore;
        participant.totalTime += actualTimeSpent;
        participant.quizzesCompleted = participant.completedQuizzes.length;

        await tournament.save();

        console.log('Debug - Tournament saved, final participant state:', {
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
        console.error("Error submitting tournament quiz:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== HISTORY ENDPOINTS =====================

// Get user's challenge history
export const getChallengeHistory = async (req, res) => {
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
        
        console.log('Debug - Found challenges for history:', challenges.length);

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
            
            console.log('Debug - User participation:', {
                challengeId: challenge._id,
                progress: userParticipation.progress,
                completed: userParticipation.completed,
                attempts: userParticipation.attempts,
                quizScores: userParticipation.quizScores
            });
            
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

        console.log('Debug - Returning challenge history:', challengeHistory.length);
        res.json({ challenges: challengeHistory });

    } catch (error) {
        console.error("Error getting challenge history:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's tournament history
export const getTournamentHistory = async (req, res) => {
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

        console.log('Debug - Found tournaments for history:', tournaments.length);

        // Extract user's specific data for each tournament
        const tournamentHistory = tournaments.map(tournament => {
            const userParticipation = tournament.participants.find(p => 
                p.user.toString() === userId
            );
            
            console.log('Debug - User tournament participation:', {
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

        console.log('Debug - Returning tournament history:', tournamentHistory.length);
        res.json({ tournaments: tournamentHistory });

    } catch (error) {
        console.error("Error getting tournament history:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up challenges with no quizzes (admin only)
export const cleanupEmptyChallenges = async (req, res) => {
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

        console.log('Debug - Found empty challenges:', emptyChallenges.length);

        // Delete empty challenges
        for (const challenge of emptyChallenges) {
            console.log('Debug - Deleting empty challenge:', challenge.title);
            await DailyChallenge.findByIdAndDelete(challenge._id);
        }

        res.json({
            message: `Cleaned up ${emptyChallenges.length} empty challenges`,
            deletedCount: emptyChallenges.length
        });

    } catch (error) {
        console.error("Error cleaning up challenges:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up tournaments with no quizzes (admin only)
export const cleanupEmptyTournaments = async (req, res) => {
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

        console.log('Debug - Found empty tournaments:', emptyTournaments.length);

        // Delete empty tournaments
        for (const tournament of emptyTournaments) {
            console.log('Debug - Deleting empty tournament:', tournament.name);
            await Tournament.findByIdAndDelete(tournament._id);
        }

        res.json({
            message: `Cleaned up ${emptyTournaments.length} empty tournaments`,
            deletedCount: emptyTournaments.length
        });

    } catch (error) {
        console.error("Error cleaning up tournaments:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== DAILY CHALLENGE RESET SYSTEM =====================

// Reset daily challenges after 24 hours (automatic system)
export const resetDailyChallenges = async () => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        console.log(`🔄 Starting daily challenge reset at ${now.toISOString()}`);
        console.log(`📅 Looking for challenges completed before ${twentyFourHoursAgo.toISOString()}`);

        // Find challenges where users completed them more than 24 hours ago
        const challengesToReset = await DailyChallenge.find({
            'participants.completed': true,
            'participants.completedAt': { $lt: twentyFourHoursAgo },
            isActive: true // Only reset active challenges
        });

        console.log(`🎯 Found ${challengesToReset.length} challenges with participants to reset`);

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
                    
                    console.log(`👤 Reset user ${participant.user} in challenge "${challenge.title}"`);
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
                
                console.log(`✅ Reset ${usersResetInChallenge} users in challenge "${challenge.title}"`);
            }
        }

        console.log(`🎉 Daily reset completed: ${totalUsersReset} users reset across ${challengesModified} challenges`);
        
        return {
            success: true,
            usersReset: totalUsersReset,
            challengesModified: challengesModified,
            timestamp: now
        };

    } catch (error) {
        console.error("❌ Error in daily challenge reset:", error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};

// Manual reset endpoint for testing (admin only)
export const manualResetDailyChallenges = async (req, res) => {
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
        console.error("Error in manual reset:", error);
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
        console.error("Error checking challenge availability:", error);
        return false;
    }
};

// Get daily challenge status for a user (enhanced with reset logic)
export const getDailyChallengeStatus = async (req, res) => {
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

            challengeStatuses.push({
                ...challenge.toObject(),
                status,
                isAvailable,
                userProgress,
                nextResetTime: participant?.completedAt ? 
                    new Date(participant.completedAt.getTime() + 24 * 60 * 60 * 1000) : null
            });
        }

        res.json({
            challenges: challengeStatuses,
            serverTime: now
        });

    } catch (error) {
        console.error("Error getting daily challenge status:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Clean up old completed challenge data (admin utility)
export const cleanupOldChallengeData = async (req, res) => {
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
        console.error("Error in cleanup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== COMPLETED CHALLENGES & TOURNAMENTS =====================

// Get user's completed daily challenges
export const getCompletedChallenges = async (req, res) => {
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
        console.error("Error getting completed challenges:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's completed tournaments
export const getCompletedTournaments = async (req, res) => {
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
        console.error("Error getting completed tournaments:", error);
        res.status(500).json({ message: "Server error" });
    }
};
