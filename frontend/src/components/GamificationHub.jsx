import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import './GamificationHub.css';

const GamificationHub = () => {
    const [activeTab, setActiveTab] = useState('challenges');
    const [dailyChallenges, setDailyChallenges] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [completedChallenges, setCompletedChallenges] = useState([]);
    const [completedTournaments, setCompletedTournaments] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Admin modal states
    const [showCreateChallenge, setShowCreateChallenge] = useState(false);
    const [showCreateTournament, setShowCreateTournament] = useState(false);
    const [challengeHistory, setChallengeHistory] = useState([]);
    const [tournamentHistory, setTournamentHistory] = useState([]);
    
    // Quiz taking states
    const [currentQuizData, setCurrentQuizData] = useState(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizType, setQuizType] = useState(null); // 'challenge' or 'tournament'
    const [gamificationId, setGamificationId] = useState(null);

    // Notification system
    const { notification, showSuccess, showError, showWarning, showInfo, hideNotification } = useNotification();

    useEffect(() => {
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        
        if (activeTab === 'challenges') {
            fetchDailyChallenge();
        } else if (activeTab === 'tournaments') {
            fetchTournaments();
        } else if (activeTab === 'completed-challenges') {
            fetchCompletedChallenges();
        } else if (activeTab === 'completed-tournaments') {
            fetchCompletedTournaments();
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchDailyChallenge = async () => {
        setLoading(true);
        try {
            // Use the enhanced status endpoint that includes reset logic
            const response = await axios.get('/api/gamification/challenges/status');
            
            if (response.data.challenges) {
                // Filter challenges: ONLY show available challenges or in-progress challenges
                // Do NOT show completed challenges (they belong in completed tab until reset)
                const availableChallenges = response.data.challenges.filter(challenge => {
                    const status = challenge.status;
                    
                    // Show if available (including reset challenges) or in progress
                    if (status === 'available' || status === 'in_progress') {
                        return true;
                    }
                    
                    // Hide completed challenges - they should only appear in completed tab
                    if (status === 'completed_today') {
                        console.log(`🚫 Hiding completed challenge "${challenge.title}" from daily view - belongs in completed tab`);
                        return false;
                    }
                    
                    return false;
                });
                
                setDailyChallenges(availableChallenges);
                
                // Log reset challenges for debugging
                availableChallenges.forEach(challenge => {
                    if (challenge.status === 'available' && challenge.userProgress && challenge.userProgress.progress > 0) {
                        console.log(`🔄 Challenge "${challenge.title}" has been reset and is available again`);
                    }
                });
                
                console.log(`📊 Daily Challenges Tab: Showing ${availableChallenges.length} available/in-progress challenges`);
            } else {
                setDailyChallenges([]);
            }
        } catch (error) {
            console.error('Error fetching daily challenge status:', error);
            if (error.response?.status === 404) {
                setDailyChallenges([]);
                // Don't set error for 404, just show no challenge state
            } else {
                showError('Failed to load daily challenge status');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchTournaments = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/gamification/tournaments');
            setTournaments(response.data.tournaments);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            showError('Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedChallenges = async () => {
        setLoading(true);
        try {
            // Use the dedicated completed challenges endpoint
            const response = await axios.get('/api/gamification/challenges/completed');
            
            if (response.data.completedChallenges) {
                setCompletedChallenges(response.data.completedChallenges);
                console.log(`📊 Completed Challenges Tab: Showing ${response.data.completedChallenges.length} completed challenges`);
            } else {
                setCompletedChallenges([]);
            }
        } catch (error) {
            console.error('Error fetching completed challenges:', error);
            showError('Failed to load completed challenges');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedTournaments = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/gamification/tournaments/completed');
            setCompletedTournaments(response.data.completedTournaments);
        } catch (error) {
            console.error('Error fetching completed tournaments:', error);
            showError('Failed to load completed tournaments');
        } finally {
            setLoading(false);
        }
    };

    const joinDailyChallenge = async (challengeId) => {
        try {
            await axios.post(`/api/gamification/challenges/${challengeId}/join`);
            fetchDailyChallenge(); // Refresh challenge data
        } catch (error) {
            console.error('Error joining challenge:', error);
            showError('Failed to join challenge');
        }
    };

    const registerForTournament = async (tournamentId) => {
        try {
            await axios.post(`/api/gamification/tournaments/${tournamentId}/register`);
            fetchTournaments(); // Refresh tournaments
        } catch (error) {
            console.error('Error registering for tournament:', error);
            showError('Failed to register for tournament');
        }
    };

    const getChallengeTypeIcon = (type) => {
        const icons = {
            'quiz_completion': '📝',
            'score_target': '🎯',
            'streak_maintenance': '🔥',
            'category_focus': '📚',
            'speed_challenge': '⚡'
        };
        return icons[type] || '🏆';
    };

    const getChallengeTypeDescription = (type, parameters) => {
        switch (type) {
            case 'quiz_completion':
                return `Complete ${parameters.quizCount} quizzes`;
            case 'score_target':
                return `Score at least ${parameters.targetScore} points in a quiz`;
            case 'streak_maintenance':
                return `Maintain a ${parameters.streakDays}-day quiz streak`;
            case 'category_focus':
                return `Complete quizzes in ${parameters.quizCategory}`;
            case 'speed_challenge':
                return `Complete a quiz in under ${parameters.timeLimit} seconds`;
            default:
                return 'Complete the challenge requirements';
        }
    };

    const getTournamentStatusColor = (status) => {
        const colors = {
            'upcoming': '#ffa726',
            'registration_open': '#66bb6a',
            'in_progress': '#42a5f5',
            'completed': '#78909c'
        };
        return colors[status] || '#78909c';
    };

    const formatTimeRemaining = (endDate) => {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        
        if (diff <= 0) return 'Expired';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h remaining`;
        }
        return `${hours}h ${minutes}m remaining`;
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const [challengeRes, tournamentRes] = await Promise.all([
                axios.get('/api/gamification/challenges/history'),
                axios.get('/api/gamification/tournaments/history')
            ]);
            setChallengeHistory((challengeRes.data.challenges || []).filter(challenge => 
                // Only show completed challenges with meaningful progress
                challenge.completed && (challenge.progress > 0 || challenge.attempts > 0 || (challenge.quizScores && challenge.quizScores.length > 0))
            ));
            setTournamentHistory(tournamentRes.data.tournaments || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            showError('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const createDailyChallenge = async (challengeData) => {
        try {
            await axios.post('/api/gamification/challenges/create', challengeData);
            fetchDailyChallenge(); // Refresh the challenge
            setShowCreateChallenge(false);
        } catch (error) {
            console.error('Error creating daily challenge:', error);
            showError('Failed to create daily challenge');
        }
    };

    const createTournament = async (tournamentData) => {
        try {
            await axios.post('/api/gamification/tournaments/create', tournamentData);
            fetchTournaments(); // Refresh tournaments
            setShowCreateTournament(false);
        } catch (error) {
            console.error('Error creating tournament:', error);
            showError('Failed to create tournament');
        }
    };

    const createSampleChallenge = async () => {
        try {
            await axios.post('/api/gamification/challenges/create-sample');
            fetchDailyChallenge(); // Refresh the challenge
        } catch (error) {
            console.error('Error creating sample challenge:', error);
            showError(error.response?.data?.message || 'Failed to create sample challenge');
        }
    };

    // Create sample tournament for testing
    const createSampleTournament = async () => {
        try {
            const response = await axios.post('/api/gamification/tournaments/create-sample');
            console.log('Sample tournament created:', response.data);
            showSuccess('Sample tournament created successfully!');
            
            // Refresh tournaments list
            fetchTournaments();
        } catch (error) {
            console.error('Error creating sample tournament:', error);
            showError(error.response?.data?.message || 'Failed to create sample tournament');
        }
    };

    // Delete daily challenge (admin only)
    const deleteDailyChallenge = async (challengeId) => {
        showWarning('Are you sure you want to delete this daily challenge? This action cannot be undone.', false);
        
        // For now, we'll use a simple confirm, but this could be enhanced with a custom modal
        if (!window.confirm('Are you sure you want to delete this daily challenge?')) {
            return;
        }
        
        try {
            await axios.delete(`/api/gamification/challenges/${challengeId}`);
            showSuccess('Daily challenge deleted successfully!');
            fetchDailyChallenge(); // Refresh
        } catch (error) {
            console.error('Error deleting challenge:', error);
            showError(error.response?.data?.message || 'Failed to delete daily challenge');
        }
    };

    // Cleanup empty challenges (admin only)
    const cleanupEmptyChallenges = async () => {
        if (!window.confirm('Are you sure you want to cleanup all challenges with no quizzes?')) {
            return;
        }
        
        try {
            const response = await axios.post('/api/gamification/challenges/cleanup');
            showSuccess(response.data.message);
            fetchDailyChallenge(); // Refresh
        } catch (error) {
            console.error('Error cleaning up challenges:', error);
            showError(error.response?.data?.message || 'Failed to cleanup challenges');
        }
    };

    // Delete tournament (admin only)
    const deleteTournament = async (tournamentId) => {
        if (!window.confirm('Are you sure you want to delete this tournament?')) {
            return;
        }
        
        try {
            await axios.delete(`/api/gamification/tournaments/${tournamentId}`);
            showSuccess('Tournament deleted successfully!');
            fetchTournaments(); // Refresh
        } catch (error) {
            console.error('Error deleting tournament:', error);
            showError(error.response?.data?.message || 'Failed to delete tournament');
        }
    };

    // Start challenge quiz
    const startChallengeQuiz = async (challengeId) => {
        try {
            const response = await axios.get(`/api/gamification/challenges/${challengeId}/quiz/start`);
            const { quiz, message } = response.data;
            
            if (quiz) {
                setCurrentQuizData(quiz);
                setQuizType('challenge');
                setGamificationId(challengeId);
                setShowQuizModal(true);
            } else {
                showError(message || 'No quiz available to start');
            }
        } catch (error) {
            console.error('Error starting challenge quiz:', error);
            showError(error.response?.data?.message || 'Failed to start challenge quiz');
        }
    };

    // Start tournament quiz
    const startTournamentQuiz = async (tournamentId) => {
        try {
            const response = await axios.get(`/api/gamification/tournaments/${tournamentId}/quiz/start`);
            const { quiz, message } = response.data;
            
            if (quiz) {
                setCurrentQuizData(quiz);
                setQuizType('tournament');
                setGamificationId(tournamentId);
                setShowQuizModal(true);
                showSuccess(message || 'Tournament quiz started successfully!');
            } else {
                showError(message || 'No quiz available to start');
            }
        } catch (error) {
            console.error('Error starting tournament quiz:', error);
            showError(error.response?.data?.message || 'Failed to start tournament quiz');
        }
    };

    // Submit quiz answers for gamification
    const submitGamificationQuiz = async (answers, score, timeTaken) => {
        try {
            let response;
            if (quizType === 'challenge') {
                response = await axios.post(`/api/gamification/challenges/${gamificationId}/quiz/submit`, {
                    quizId: currentQuizData._id,
                    answers,
                    score,
                    timeTaken
                });
            } else if (quizType === 'tournament') {
                response = await axios.post(`/api/gamification/tournaments/${gamificationId}/quiz/submit`, {
                    quizId: currentQuizData._id,
                    answers,
                    score,
                    timeTaken
                });
            }
            
            showSuccess(response.data.message || 'Quiz submitted successfully!');
            setShowQuizModal(false);
            setCurrentQuizData(null);
            setQuizType(null);
            setGamificationId(null);
            
            // Refresh the data
            if (quizType === 'challenge') {
                fetchDailyChallenge();
                // Also refresh completed challenges in case this challenge was completed
                if (activeTab === 'completed-challenges') {
                    fetchCompletedChallenges();
                }
            } else {
                fetchTournaments();
                // Also refresh completed tournaments in case this tournament was completed
                if (activeTab === 'completed-tournaments') {
                    fetchCompletedTournaments();
                }
            }
        } catch (error) {
            console.error('Error submitting gamification quiz:', error);
            showError(error.response?.data?.message || 'Failed to submit quiz');
        }
    };

    const DailyChallengeCard = ({ challenge }) => {
        if (!challenge) {
            return null;
        }

        // Use the enhanced status data from the new API
        const challengeStatus = challenge.status || 'available';
        const challengeUserProgress = challenge.userProgress || {};
        const progressPercentage = challengeUserProgress.progress || 0;
        const isCompleted = challengeStatus === 'completed_today';
        const isAvailable = challenge.isAvailable !== false; // Default to true
        
        // Check if user is participating - look for user in the participants array
        const userId = user?.id || user?._id;
        
        let participantData = null;
        let isParticipating = false;
        
        if (userId && challenge.participants) {
            participantData = challenge.participants.find(p => {
                const participantUserId = p.user?._id || p.user;
                return participantUserId.toString() === userId.toString();
            });
            isParticipating = participantData !== undefined;
        }

        // Determine the status message and styling
        let statusMessage = '';
        let statusClass = '';
        
        switch (challengeStatus) {
            case 'available':
                if (challengeUserProgress.progress > 0) {
                    statusMessage = '🔄 Challenge Reset - Ready to Continue!';
                    statusClass = 'status-reset';
                } else {
                    statusMessage = '✨ Ready to Start';
                    statusClass = 'status-available';
                }
                break;
            case 'in_progress':
                statusMessage = '⏳ In Progress';
                statusClass = 'status-progress';
                break;
            case 'completed_today':
                if (challenge.nextResetTime) {
                    const resetTime = new Date(challenge.nextResetTime);
                    const now = new Date();
                    const hoursLeft = Math.ceil((resetTime - now) / (1000 * 60 * 60));
                    statusMessage = `✅ Completed - Resets in ${hoursLeft}h`;
                } else {
                    statusMessage = '✅ Completed Today';
                }
                statusClass = 'status-completed';
                break;
        }

        return (
            <motion.div
                className="daily-challenge-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
            >
                <div className="challenge-header">
                    <div className="challenge-icon">
                        {getChallengeTypeIcon(challenge.type)}
                    </div>
                    <div className="challenge-info">
                        <h3>{challenge.title}</h3>
                        <p className="challenge-type">
                            {getChallengeTypeDescription(challenge.type, challenge.parameters)}
                        </p>
                        <div className={`challenge-status ${statusClass}`}>
                            {statusMessage}
                        </div>
                    </div>
                    <div className="challenge-time">
                        {formatTimeRemaining(challenge.endDate)}
                    </div>
                </div>

                <div className="challenge-description">
                    <p>{challenge.description}</p>
                </div>

                <div className="challenge-progress">
                    <div className="progress-header">
                        <span>Progress</span>
                        <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="progress-bar">
                        <motion.div
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>

                <div className="challenge-rewards">
                    <h4>🎁 Rewards</h4>
                    <div className="rewards-list">
                        <div className="reward-item">
                            <span className="reward-icon">⭐</span>
                            <span className="reward-text">{challenge.rewards.xp} XP</span>
                        </div>
                        {challenge.rewards.badge && (
                            <div className="reward-item">
                                <span className="reward-icon">🏅</span>
                                <span className="reward-text">{challenge.rewards.badge}</span>
                            </div>
                        )}
                        {challenge.rewards.theme && (
                            <div className="reward-item">
                                <span className="reward-icon">🎨</span>
                                <span className="reward-text">{challenge.rewards.theme} Theme</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="challenge-actions">
                    {isCompleted && challengeStatus === 'completed_today' ? (
                        <div className="completed-section">
                            <button className="completed-btn" disabled>
                                ✅ Challenge Completed Today!
                            </button>
                            {challenge.nextResetTime && (
                                <div className="reset-timer">
                                    <small>
                                        🔄 Resets at {new Date(challenge.nextResetTime).toLocaleTimeString()}
                                    </small>
                                </div>
                            )}
                            {participantData?.quizScores && participantData.quizScores.length > 0 && (
                                <div className="completed-scores">
                                    <h4>📊 Your Performance</h4>
                                    <div className="scores-grid">
                                        {participantData.quizScores.map((scoreData, index) => (
                                            <div key={index} className="score-item">
                                                <span className="quiz-number">Quiz {index + 1}</span>
                                                <span className="score-percentage">{Math.round(scoreData.percentage)}%</span>
                                                <span className="score-points">{scoreData.score} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="total-score">
                                        <strong>
                                            Total Score: {participantData.quizScores.reduce((total, score) => total + score.score, 0)} points
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (challengeStatus === 'available' || challengeStatus === 'in_progress') && isAvailable ? (
                        <div className="available-actions">
                            {challengeStatus === 'available' && challengeUserProgress.progress > 0 ? (
                                <div className="reset-continue-section">
                                    <div className="reset-info">
                                        <span className="reset-message">
                                            🔄 This challenge has been reset! Your previous progress was: {Math.round(challengeUserProgress.progress)}%
                                        </span>
                                    </div>
                                    <button
                                        className="join-challenge-btn reset-continue"
                                        onClick={() => joinDailyChallenge(challenge._id)}
                                        disabled={loading}
                                    >
                                        🚀 Start Fresh Challenge
                                    </button>
                                </div>
                            ) : challengeStatus === 'in_progress' || isParticipating ? (
                                <div className="quiz-progress-actions">
                                    <div className="quiz-progress-info">
                                        <span className="quiz-count">
                                            {participantData?.completedQuizzes?.length || 0} / {challenge.quizzes?.length || challenge.parameters?.quizCount || 3} quizzes completed
                                        </span>
                                    </div>
                                    <button
                                        className="continue-challenge-btn"
                                        onClick={() => startChallengeQuiz(challenge._id)}
                                        disabled={loading}
                                    >
                                        Continue Challenge 
                                    </button>
                                </div>
                            ) : challengeStatus === 'available' ? (
                                <button
                                    className="join-challenge-btn"
                                    onClick={() => joinDailyChallenge(challenge._id)}
                                    disabled={loading}
                                >
                                    Join Challenge 🚀
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="not-available">
                            <span className="not-available-message">
                                ⏳ Challenge not currently available
                            </span>
                        </div>
                    )}
                    
                    {user?.role === 'admin' && (
                        <button 
                            className="delete-btn admin-btn"
                            onClick={() => deleteDailyChallenge(challenge._id)}
                            title="Delete Challenge"
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>

                <div className="challenge-stats">
                    <div className="stat">
                        <span className="stat-value">{challenge.stats?.totalParticipants || 0}</span>
                        <span className="stat-label">Participants</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{Math.round(challenge.stats?.completionRate || 0)}%</span>
                        <span className="stat-label">Completion Rate</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{participantData?.attempts || 0}</span>
                        <span className="stat-label">Your Attempts</span>
                    </div>
                    {isCompleted && participantData?.quizScores && (
                        <div className="stat">
                            <span className="stat-value">
                                {Math.round(participantData.quizScores.reduce((total, score) => total + score.percentage, 0) / participantData.quizScores.length)}%
                            </span>
                            <span className="stat-label">Avg Score</span>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    const TournamentCard = ({ tournament }) => {
        const userId = user?.id || user?._id;
        
        // Check if user is registered and get their progress data
        let isRegistered = false;
        let userProgress = null;
        
        if (userId && tournament.participants) {
            const participant = tournament.participants.find(p => 
                p.user === userId || p.user.toString() === userId
            );
            isRegistered = !!participant;
            userProgress = participant;
        }
        
        return (
            <motion.div
                className="tournament-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
            >
                <div className="tournament-header">
                    <div className="tournament-icon">🏆</div>
                    <div className="tournament-info">
                        <h3>{tournament.name}</h3>
                        <div className="tournament-meta">
                            <span className="tournament-type">{tournament.type.replace('_', ' ')}</span>
                            <span 
                                className="tournament-status"
                                style={{ color: getTournamentStatusColor(tournament.status) }}
                            >
                                {tournament.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="tournament-description">
                    <p>{tournament.description}</p>
                </div>

                <div className="tournament-details">
                    <div className="detail-row">
                        <span className="detail-label">📅 Registration:</span>
                        <span className="detail-value">
                            {new Date(tournament.registrationStart).toLocaleDateString()} - {new Date(tournament.registrationEnd).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">🎮 Tournament:</span>
                        <span className="detail-value">
                            {new Date(tournament.tournamentStart).toLocaleDateString()} - {new Date(tournament.tournamentEnd).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">⏱️ Duration:</span>
                        <span className="detail-value">{tournament.settings.duration} hours</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">🎯 Category:</span>
                        <span className="detail-value">{tournament.settings.quizCategory || 'Mixed'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">📝 Quizzes:</span>
                        <span className="detail-value">{tournament.quizCount || tournament.settings?.quizCount || 'TBD'}</span>
                    </div>
                </div>

                {/* Show user progress if registered */}
                {isRegistered && userProgress && (
                    <div className="tournament-progress">
                        <h4>📊 Your Progress</h4>
                        <div className="progress-stats">
                            <div className="progress-stat">
                                <span className="stat-value">{userProgress.quizzesCompleted || 0}</span>
                                <span className="stat-label">Quizzes Completed</span>
                            </div>
                            <div className="progress-stat">
                                <span className="stat-value">{userProgress.currentScore || 0}</span>
                                <span className="stat-label">Current Score</span>
                            </div>
                            <div className="progress-stat">
                                <span className="stat-value">#{userProgress.rank || 'N/A'}</span>
                                <span className="stat-label">Current Rank</span>
                            </div>
                        </div>
                        {userProgress.quizScores && userProgress.quizScores.length > 0 && (
                            <div className="completed-scores">
                                <h5>🎯 Quiz Scores</h5>
                                <div className="scores-grid">
                                    {userProgress.quizScores.map((scoreData, index) => (
                                        <div key={index} className="score-item">
                                            <span className="quiz-number">Quiz {index + 1}</span>
                                            <span className="score-percentage">{Math.round(scoreData.percentage)}%</span>
                                            <span className="score-points">{scoreData.score} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="tournament-prizes">
                    <h4>🏆 Prizes</h4>
                    <div className="prizes-list">
                        {tournament.prizes?.map((prize, index) => (
                            <div key={index} className="prize-item">
                                <span className="prize-position">{prize.position}st</span>
                                <div className="prize-rewards">
                                    {prize.xp && <span className="prize-reward">⭐ {prize.xp} XP</span>}
                                    {prize.badge && <span className="prize-reward">🏅 {prize.badge}</span>}
                                    {prize.theme && <span className="prize-reward">🎨 {prize.theme}</span>}
                                    {prize.title && <span className="prize-reward">👑 {prize.title}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="tournament-stats">
                    <div className="stat">
                        <span className="stat-value">{tournament.stats?.totalParticipants || 0}</span>
                        <span className="stat-label">Participants</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{tournament.settings.maxParticipants}</span>
                        <span className="stat-label">Max</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{tournament.settings.entryFee || 0}</span>
                        <span className="stat-label">Entry Fee (XP)</span>
                    </div>
                </div>

                <div className="tournament-actions">
                    {tournament.status === 'registration_open' && !isRegistered ? (
                        <button
                            className="register-btn"
                            onClick={() => registerForTournament(tournament._id)}
                        >
                            🎯 Register Now
                        </button>
                    ) : isRegistered && tournament.status === 'in_progress' ? (
                        <div className="tournament-progress-actions">
                            <div className="tournament-progress-info">
                                <span className="quiz-count">
                                    {userProgress?.quizzesCompleted || 0} / {tournament.quizCount || tournament.settings?.quizCount || 0} quizzes completed
                                </span>
                            </div>
                            <button 
                                className="participate-btn"
                                onClick={() => startTournamentQuiz(tournament._id)}
                            >
                                🎮 Continue Tournament
                            </button>
                        </div>
                    ) : isRegistered ? (
                        <button className="registered-btn" disabled>
                            ✅ Registered
                        </button>
                    ) : (
                        <button className="disabled-btn" disabled>
                            Registration Closed
                        </button>
                    )}
                    <button className="leaderboard-btn">
                        📊 View Leaderboard
                    </button>
                    
                    {user?.role === 'admin' && (
                        <button 
                            className="delete-btn admin-btn"
                            onClick={() => deleteTournament(tournament._id)}
                            title="Delete Tournament"
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>
            </motion.div>
        );
    };

    // CompletedChallengeCard Component - Shows completed challenge with scores and stats
    const CompletedChallengeCard = ({ challenge }) => {
        if (!challenge || !challenge.userProgress) {
            return null;
        }

        const userProgress = challenge.userProgress;

        // Calculate time until reset
        const getResetTimeInfo = () => {
            if (challenge.nextResetTime) {
                const resetTime = new Date(challenge.nextResetTime);
                const now = new Date();
                const hoursLeft = Math.ceil((resetTime - now) / (1000 * 60 * 60));
                
                if (hoursLeft > 0) {
                    return {
                        text: `Resets in ${hoursLeft}h`,
                        timeLeft: hoursLeft,
                        resetTime: resetTime.toLocaleTimeString()
                    };
                } else {
                    return {
                        text: 'Ready to reset',
                        timeLeft: 0,
                        resetTime: null
                    };
                }
            }
            return null;
        };

        const resetInfo = getResetTimeInfo();

        return (
            <motion.div
                className="daily-challenge-card completed-challenge-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
            >
                <div className="challenge-header">
                    <div className="challenge-icon">
                        {getChallengeTypeIcon(challenge.type)}
                    </div>
                    <div className="challenge-info">
                        <h3>{challenge.title}</h3>
                        <p className="challenge-type">
                            {getChallengeTypeDescription(challenge.type, challenge.parameters)}
                        </p>
                        <div className="challenge-status status-completed">
                            ✅ Completed Today
                        </div>
                        {resetInfo && (
                            <div className="reset-timer-info">
                                <small>🔄 {resetInfo.text}</small>
                                {resetInfo.resetTime && (
                                    <small> at {resetInfo.resetTime}</small>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="completion-badge">
                        <span className="completed-icon">✅</span>
                        <span className="completed-text">Completed</span>
                    </div>
                </div>

                <div className="challenge-description">
                    <p>{challenge.description}</p>
                    <div className="completed-notice">
                        <p>
                            <strong>🎉 Challenge completed!</strong> This challenge will become available again after the 24-hour reset period.
                        </p>
                    </div>
                </div>

                <div className="completion-stats">
                    <div className="stat-row">
                        <div className="stat-item">
                            <span className="stat-label">Final Score</span>
                            <span className="stat-value">{userProgress.totalScore || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average %</span>
                            <span className="stat-value">{userProgress.averagePercentage ? Math.round(userProgress.averagePercentage) + '%' : '0%'}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Time Spent</span>
                            <span className="stat-value">{userProgress.totalTimeSpent ? Math.round(userProgress.totalTimeSpent / 60) + 'm' : '0m'}</span>
                        </div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-item">
                            <span className="stat-label">Attempts</span>
                            <span className="stat-value">{userProgress.attempts || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Completed</span>
                            <span className="stat-value">
                                {userProgress.completedAt ? new Date(userProgress.completedAt).toLocaleDateString() : 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="challenge-rewards">
                    <h4>🎁 Earned Rewards</h4>
                    <div className="rewards-list">
                        <div className="reward-item">
                            <span className="reward-icon">⭐</span>
                            <span className="reward-text">{challenge.rewards.xp} XP</span>
                        </div>
                        {challenge.rewards.badge && (
                            <div className="reward-item">
                                <span className="reward-icon">🏅</span>
                                <span className="reward-text">{challenge.rewards.badge}</span>
                            </div>
                        )}
                        {challenge.rewards.theme && (
                            <div className="reward-item">
                                <span className="reward-icon">🎨</span>
                                <span className="reward-text">{challenge.rewards.theme} Theme</span>
                            </div>
                        )}
                    </div>
                </div>

                {userProgress.quizScores && userProgress.quizScores.length > 0 && (
                    <div className="quiz-scores">
                        <h4>📊 Quiz Scores</h4>
                        <div className="scores-list">
                            {userProgress.quizScores.map((score, index) => (
                                <div key={index} className="score-item">
                                    <span className="quiz-number">Quiz {index + 1}</span>
                                    <span className="quiz-score">{Math.round(score.score)} pts</span>
                                    <span className="quiz-percentage">({Math.round(score.percentage)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        );
    };

    // CompletedTournamentCard Component - Shows completed tournament with rank and performance
    const CompletedTournamentCard = ({ tournament }) => {
        const { userPerformance } = tournament;
        
        if (!tournament || !userPerformance) {
            return null;
        }

        const getRankDisplay = (rank) => {
            if (rank === 1) return "🥇 1st Place";
            if (rank === 2) return "🥈 2nd Place";  
            if (rank === 3) return "🥉 3rd Place";
            return `#${rank}`;
        };

        const getRankClass = (rank) => {
            if (rank <= 3) return "top-rank";
            if (rank <= 10) return "good-rank";
            return "normal-rank";
        };

        return (
            <motion.div
                className="tournament-card completed-tournament-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
            >
                <div className="tournament-header">
                    <div className="tournament-info">
                        <h3>{tournament.name}</h3>
                        <p className="tournament-category">{tournament.category}</p>
                    </div>
                    <div className={`rank-badge ${getRankClass(userPerformance.rank)}`}>
                        {getRankDisplay(userPerformance.rank)}
                    </div>
                </div>

                <div className="tournament-description">
                    <p>{tournament.description}</p>
                </div>

                <div className="performance-stats">
                    <div className="stat-row">
                        <div className="stat-item">
                            <span className="stat-label">Final Score</span>
                            <span className="stat-value">{userPerformance.finalScore}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average %</span>
                            <span className="stat-value">{Math.round(userPerformance.averagePercentage)}%</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Time</span>
                            <span className="stat-value">{Math.round(userPerformance.totalTime / 60)}m</span>
                        </div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-item">
                            <span className="stat-label">Quizzes Done</span>
                            <span className="stat-value">{userPerformance.quizzesCompleted}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Participants</span>
                            <span className="stat-value">{tournament.totalParticipants}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Status</span>
                            <span className="stat-value">{userPerformance.eliminated ? 'Eliminated' : 'Finished'}</span>
                        </div>
                    </div>
                </div>

                {tournament.prizes && tournament.prizes.length > 0 && userPerformance.rank <= 3 && (
                    <div className="tournament-prizes">
                        <h4>🏆 Prize Earned</h4>
                        {tournament.prizes
                            .filter(prize => prize.position === userPerformance.rank)
                            .map((prize, index) => (
                                <div key={index} className="prize-list">
                                    <div className="prize-item">
                                        <span className="prize-icon">⭐</span>
                                        <span className="prize-text">{Math.round(prize.xp)} XP</span>
                                    </div>
                                    {prize.badge && (
                                        <div className="prize-item">
                                            <span className="prize-icon">🏅</span>
                                            <span className="prize-text">{prize.badge}</span>
                                        </div>
                                    )}
                                    {prize.title && (
                                        <div className="prize-item">
                                            <span className="prize-icon">👑</span>
                                            <span className="prize-text">{prize.title}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}

                {userPerformance.quizScores && userPerformance.quizScores.length > 0 && (
                    <div className="quiz-scores">
                        <h4>📊 Quiz Performance</h4>
                        <div className="scores-list">
                            {userPerformance.quizScores.map((score, index) => (
                                <div key={index} className="score-item">
                                    <span className="quiz-number">Quiz {index + 1}</span>
                                    <span className="quiz-score">{score.score} pts</span>
                                    <span className="quiz-percentage">({score.percentage}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="tournament-dates">
                    <span className="date-info">
                        Completed: {new Date(tournament.tournamentEnd).toLocaleDateString()}
                    </span>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="gamification-hub">
            <motion.div
                className="hub-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2>🎮 Gamification Hub</h2>
                <p>Take on daily challenges and compete in tournaments to earn amazing rewards!</p>
            </motion.div>

            <div className="hub-tabs">
                <button
                    className={`tab-button ${activeTab === 'challenges' ? 'active' : ''}`}
                    onClick={() => setActiveTab('challenges')}
                >
                    🎯 Daily Challenges
                </button>
                <button
                    className={`tab-button ${activeTab === 'completed-challenges' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed-challenges')}
                >
                    ✅ Completed Challenges
                </button>
                <button
                    className={`tab-button ${activeTab === 'tournaments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tournaments')}
                >
                    🏆 Tournaments
                </button>
                <button
                    className={`tab-button ${activeTab === 'completed-tournaments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed-tournaments')}
                >
                    🏅 Completed Tournaments
                </button>
                <button
                    className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📊 My History
                </button>
                {user?.role === 'admin' && (
                    <>
                        <button
                            className="admin-create-btn"
                            onClick={() => setShowCreateChallenge(true)}
                            title="Create Daily Challenge"
                        >
                            ➕ Create Challenge
                        </button>
                        <button
                            className="admin-create-btn"
                            onClick={() => setShowCreateTournament(true)}
                            title="Create Tournament"
                        >
                            ➕ Create Tournament
                        </button>
                        <button
                            className="admin-sample-btn"
                            onClick={createSampleTournament}
                            title="Create Sample Tournament for Testing"
                        >
                            🏆 Sample Tournament
                        </button>
                    </>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'challenges' && (
                    <motion.div
                        key="challenges-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading daily challenges...</p>
                            </div>
                        ) : dailyChallenges.length > 0 ? (
                            <div className="challenges-container">
                                {dailyChallenges.map((challenge, index) => (
                                    <DailyChallengeCard key={challenge._id || index} challenge={challenge} />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                className="no-challenge-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="no-challenge-icon">😴</div>
                                <h3>No Daily Challenge Today</h3>
                                <p>Check back tomorrow for a new exciting challenge!</p>
                                {user?.role === 'admin' && (
                                    <div className="admin-actions">
                                        <button 
                                            className="create-sample-btn"
                                            onClick={createSampleChallenge}
                                        >
                                            Create Sample Challenge
                                        </button>
                                        <button 
                                            className="cleanup-btn"
                                            onClick={cleanupEmptyChallenges}
                                            style={{ marginLeft: '10px', backgroundColor: '#e74c3c' }}
                                        >
                                            Cleanup Empty Challenges
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'tournaments' && (
                    <motion.div
                        key="tournaments-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading tournaments...</p>
                            </div>
                        ) : tournaments.length > 0 ? (
                            <div className="tournaments-grid">
                                {tournaments.map(tournament => (
                                    <TournamentCard key={tournament._id} tournament={tournament} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🏆</div>
                                <h3>No Active Tournaments</h3>
                                <p>Check back soon for exciting tournaments to participate in!</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'completed-challenges' && (
                    <motion.div
                        key="completed-challenges-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading completed challenges...</p>
                            </div>
                        ) : completedChallenges.length > 0 ? (
                            <div className="challenges-container">
                                {completedChallenges.map((challenge, index) => (
                                    <CompletedChallengeCard key={challenge._id || index} challenge={challenge} />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                className="no-challenge-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="no-challenge-icon">📝</div>
                                <h3>No Completed Challenges</h3>
                                <p>Complete some daily challenges to see them here!</p>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'completed-tournaments' && (
                    <motion.div
                        key="completed-tournaments-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading completed tournaments...</p>
                            </div>
                        ) : completedTournaments.length > 0 ? (
                            <div className="tournaments-grid">
                                {completedTournaments.map(tournament => (
                                    <CompletedTournamentCard key={tournament._id} tournament={tournament} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🏅</div>
                                <h3>No Completed Tournaments</h3>
                                <p>Participate in tournaments to see your results here!</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        key="history-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading your history...</p>
                            </div>
                        ) : (
                            <div className="history-section">
                                <div className="history-challenges">
                                    <h3>🎯 Challenge History</h3>
                                    {challengeHistory.length > 0 ? (
                                        <div className="history-grid">
                                            {challengeHistory.map(challenge => (
                                                <motion.div
                                                    key={challenge._id}
                                                    className="history-card challenge-history"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ scale: 1.02 }}
                                                >
                                                    <div className="history-header">
                                                        <span className="history-icon">
                                                            {getChallengeTypeIcon(challenge.type)}
                                                        </span>
                                                        <div className="history-info">
                                                            <h4>{challenge.title}</h4>
                                                            <p className="history-date">
                                                                {new Date(challenge.completedAt || challenge.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="history-status">
                                                            {challenge.completed ? (
                                                                <span className="status-completed">✅ Completed</span>
                                                            ) : (
                                                                <span className="status-failed">❌ Failed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="history-details">
                                                        <div className="progress-info">
                                                            <span>Progress: {challenge.progress}%</span>
                                                            <div className="mini-progress-bar">
                                                                <div 
                                                                    className="mini-progress-fill"
                                                                    style={{ width: `${challenge.progress}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        {challenge.completed && challenge.rewards && (
                                                            <div className="earned-rewards">
                                                                <span>Earned: </span>
                                                                {challenge.rewards.xp && <span className="reward">⭐ {challenge.rewards.xp} XP</span>}
                                                                {challenge.rewards.badge && <span className="reward">🏅 {challenge.rewards.badge}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">
                                            <div className="empty-icon">🎯</div>
                                            <p>No challenge history yet. Complete your first daily challenge!</p>
                                        </div>
                                    )}
                                </div>

                                <div className="history-tournaments">
                                    <h3>🏆 Tournament History</h3>
                                    {tournamentHistory.length > 0 ? (
                                        <div className="history-grid">
                                            {tournamentHistory.map(tournament => (
                                                <motion.div
                                                    key={tournament._id}
                                                    className="history-card tournament-history"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileHover={{ scale: 1.02 }}
                                                >
                                                    <div className="history-header">
                                                        <span className="history-icon">🏆</span>
                                                        <div className="history-info">
                                                            <h4>{tournament.title}</h4>
                                                            <p className="history-date">
                                                                {new Date(tournament.endDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="history-rank">
                                                            {tournament.userRank ? (
                                                                <span className="rank-badge">#{tournament.userRank}</span>
                                                            ) : (
                                                                <span className="rank-participated">Participated</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="history-details">
                                                        <div className="tournament-scores">
                                                            <span>Best Score: {tournament.userBestScore || 0}</span>
                                                            <span>Total Participants: {tournament.stats?.totalParticipants || 0}</span>
                                                        </div>
                                                        {tournament.userRank <= 3 && tournament.prizes && (
                                                            <div className="earned-rewards">
                                                                <span>Earned: </span>
                                                                {tournament.prizes[tournament.userRank - 1]?.xp && (
                                                                    <span className="reward">⭐ {tournament.prizes[tournament.userRank - 1].xp} XP</span>
                                                                )}
                                                                {tournament.prizes[tournament.userRank - 1]?.badge && (
                                                                    <span className="reward">🏅 {tournament.prizes[tournament.userRank - 1].badge}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">
                                            <div className="empty-icon">🏆</div>
                                            <p>No tournament history yet. Join your first tournament!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admin Create Challenge Modal */}
            {showCreateChallenge && (
                <CreateChallengeModal 
                    onClose={() => setShowCreateChallenge(false)}
                    onCreate={createDailyChallenge}
                />
            )}

            {/* Admin Create Tournament Modal */}
            {showCreateTournament && (
                <CreateTournamentModal 
                    onClose={() => setShowCreateTournament(false)}
                    onCreate={createTournament}
                />
            )}

            {/* Game Quiz Modal */}
            <GameQuizModal
                isOpen={showQuizModal}
                onClose={() => {
                    setShowQuizModal(false);
                    setCurrentQuizData(null);
                    setQuizType(null);
                    setGamificationId(null);
                }}
                quiz={currentQuizData}
                onSubmit={submitGamificationQuiz}
                quizType={quizType}
                gamificationTitle={
                    quizType === 'challenge' ? dailyChallenges.find(c => c._id === gamificationId)?.title :
                    quizType === 'tournament' ? tournaments.find(t => t._id === gamificationId)?.name :
                    ''
                }
            />
            
            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

// Create Challenge Modal Component
const CreateChallengeModal = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'quiz_completion',
        parameters: {
            quizCount: 3,
            targetScore: 80,
            streakDays: 7,
            quizCategory: 'General',
            timeLimit: 300
        },
        rewards: {
            xp: 150,
            badge: '',
            theme: ''
        },
        selectedQuizzes: [],
        timeLimit: 300,
        duration: 24 // hours
    });

    const [creating, setCreating] = useState(false);
    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);

    // Fetch available quizzes when modal opens
    useEffect(() => {
        fetchAvailableQuizzes();
    }, []);

    const fetchAvailableQuizzes = async () => {
        setLoadingQuizzes(true);
        try {
            const response = await axios.get('/api/gamification/quizzes/available');
            setAvailableQuizzes(response.data.quizzes);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        } finally {
            setLoadingQuizzes(false);
        }
    };

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.selectedQuizzes.length === 0) {
            alert('Please select at least one quiz for the challenge.');
            return;
        }
        
        setCreating(true);
        
        // Calculate start and end dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + formData.duration);
        
        const challengeData = {
            ...formData,
            quizzes: formData.selectedQuizzes,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
        
        await onCreate(challengeData);
        setCreating(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div 
                className="modal-content create-challenge-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="modal-header">
                    <h2>🎯 Create Daily Challenge</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className="create-form">
                    <div className="form-group">
                        <label>Challenge Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            required
                            placeholder="Enter challenge title..."
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            required
                            placeholder="Describe the challenge..."
                            rows="3"
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Challenge Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                            >
                                <option value="quiz_completion">Quiz Completion</option>
                                <option value="score_target">Score Target</option>
                                <option value="streak_maintenance">Streak Maintenance</option>
                                <option value="category_focus">Category Focus</option>
                                <option value="speed_challenge">Speed Challenge</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Duration (hours)</label>
                            <input
                                type="number"
                                value={formData.duration}
                                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                                min="1"
                                max="72"
                            />
                        </div>
                    </div>
                    
                    {/* Challenge Parameters */}
                    <div className="challenge-parameters">
                        <h4>Challenge Parameters</h4>
                        {formData.type === 'quiz_completion' && (
                            <div className="form-group">
                                <label>Number of Quizzes</label>
                                <input
                                    type="number"
                                    value={formData.parameters.quizCount}
                                    onChange={(e) => handleInputChange('parameters.quizCount', parseInt(e.target.value))}
                                    min="1"
                                    max="10"
                                />
                            </div>
                        )}
                        
                        {formData.type === 'score_target' && (
                            <div className="form-group">
                                <label>Target Score</label>
                                <input
                                    type="number"
                                    value={formData.parameters.targetScore}
                                    onChange={(e) => handleInputChange('parameters.targetScore', parseInt(e.target.value))}
                                    min="1"
                                    max="100"
                                />
                            </div>
                        )}
                        
                        {formData.type === 'streak_maintenance' && (
                            <div className="form-group">
                                <label>Streak Days</label>
                                <input
                                    type="number"
                                    value={formData.parameters.streakDays}
                                    onChange={(e) => handleInputChange('parameters.streakDays', parseInt(e.target.value))}
                                    min="2"
                                    max="30"
                                />
                            </div>
                        )}
                        
                        {formData.type === 'category_focus' && (
                            <div className="form-group">
                                <label>Quiz Category</label>
                                <select
                                    value={formData.parameters.quizCategory}
                                    onChange={(e) => handleInputChange('parameters.quizCategory', e.target.value)}
                                >
                                    <option value="General">General</option>
                                    <option value="Science">Science</option>
                                    <option value="History">History</option>
                                    <option value="Math">Math</option>
                                    <option value="Literature">Literature</option>
                                </select>
                            </div>
                        )}
                        
                        {formData.type === 'speed_challenge' && (
                            <div className="form-group">
                                <label>Time Limit (seconds)</label>
                                <input
                                    type="number"
                                    value={formData.parameters.timeLimit}
                                    onChange={(e) => handleInputChange('parameters.timeLimit', parseInt(e.target.value))}
                                    min="30"
                                    max="600"
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Quiz Selection */}
                    <div className="quiz-selection">
                        <h4>Select Quizzes for Challenge {availableQuizzes.length > 0 && `(${availableQuizzes.length} available)`}</h4>
                        {formData.selectedQuizzes.length > 0 && (
                            <p className="selected-count">
                                {formData.selectedQuizzes.length} quiz{formData.selectedQuizzes.length !== 1 ? 'es' : ''} selected
                            </p>
                        )}
                        {availableQuizzes.length > 5 && (
                            <p className="scroll-hint">
                                💡 Tip: Scroll down to see more quizzes ({availableQuizzes.length} total)
                            </p>
                        )}
                        {loadingQuizzes ? (
                            <p>Loading available quizzes...</p>
                        ) : availableQuizzes.length > 0 ? (
                            <div className="quiz-list">
                                {availableQuizzes.map(quiz => (
                                    <label 
                                        key={quiz._id} 
                                        className={`quiz-checkbox ${formData.selectedQuizzes.includes(quiz._id) ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedQuizzes.includes(quiz._id)}
                                            onChange={(e) => {
                                                const quizId = quiz._id;
                                                if (e.target.checked) {
                                                    // Avoid duplicates
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        selectedQuizzes: prev.selectedQuizzes.includes(quizId) 
                                                            ? prev.selectedQuizzes 
                                                            : [...prev.selectedQuizzes, quizId]
                                                    }));
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        selectedQuizzes: prev.selectedQuizzes.filter(id => id !== quizId)
                                                    }));
                                                }
                                            }}
                                        />
                                        <div className="quiz-info">
                                            <span className="quiz-title">{quiz.title}</span>
                                            <span className="quiz-details">
                                                {quiz.category} • {quiz.questions?.length || 0} questions
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="no-quizzes">No quizzes available. Please create some quizzes first.</p>
                        )}
                        
                        <div className="form-group">
                            <label>Time Limit per Quiz (seconds)</label>
                            <input
                                type="number"
                                value={formData.timeLimit}
                                onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                                min="60"
                                max="1800"
                            />
                        </div>
                    </div>
                    
                    {/* Rewards */}
                    <div className="challenge-rewards-form">
                        <h4>Rewards</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>XP Reward</label>
                                <input
                                    type="number"
                                    value={formData.rewards.xp}
                                    onChange={(e) => handleInputChange('rewards.xp', parseInt(e.target.value))}
                                    min="50"
                                    max="500"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Badge (optional)</label>
                                <input
                                    type="text"
                                    value={formData.rewards.badge}
                                    onChange={(e) => handleInputChange('rewards.badge', e.target.value)}
                                    placeholder="Badge name..."
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Theme Unlock (optional)</label>
                            <input
                                type="text"
                                value={formData.rewards.theme}
                                onChange={(e) => handleInputChange('rewards.theme', e.target.value)}
                                placeholder="Theme name..."
                            />
                        </div>
                    </div>
                    
                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="create-btn" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Challenge'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Create Tournament Modal Component
const CreateTournamentModal = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '', // Tournament model uses 'name' field
        description: '',
        type: 'single_elimination',
        category: 'General',
        settings: {
            maxParticipants: 32,
            entryFee: 0,
            duration: 7, // days
            timeLimit: 300 // seconds per quiz
        },
        selectedQuizzes: [],
        prizes: [
            { position: 1, xp: 500, badge: 'Champion', title: 'Tournament Winner' },
            { position: 2, xp: 300, badge: 'Runner-up' },
            { position: 3, xp: 200, badge: 'Third Place' }
        ]
    });

    const [creating, setCreating] = useState(false);
    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);

    // Fetch available quizzes when modal opens
    useEffect(() => {
        fetchAvailableQuizzes();
    }, []);

    const fetchAvailableQuizzes = async () => {
        setLoadingQuizzes(true);
        try {
            const response = await axios.get('/api/gamification/quizzes/available');
            setAvailableQuizzes(response.data.quizzes);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        } finally {
            setLoadingQuizzes(false);
        }
    };

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handlePrizeChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            prizes: prev.prizes.map((prize, i) => 
                i === index ? { ...prize, [field]: value } : prize
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.selectedQuizzes.length === 0) {
            alert('Please select at least one quiz for the tournament.');
            return;
        }
        
        setCreating(true);
        
        // Calculate registration and tournament dates
        const registrationStart = new Date();
        registrationStart.setHours(0, 0, 0, 0); // Start from beginning of today
        
        const registrationEnd = new Date();
        registrationEnd.setDate(registrationEnd.getDate() + 2); // 2 days registration
        registrationEnd.setHours(23, 59, 59, 999); // End at end of day
        
        const tournamentStart = new Date();
        tournamentStart.setDate(tournamentStart.getDate() + 3); // Start 3 days from now
        tournamentStart.setHours(9, 0, 0, 0); // Start at 9 AM
        
        const tournamentEnd = new Date();
        tournamentEnd.setDate(tournamentEnd.getDate() + 3 + formData.settings.duration);
        tournamentEnd.setHours(18, 0, 0, 0); // End at 6 PM
        
        const tournamentData = {
            ...formData,
            quizzes: formData.selectedQuizzes,
            registrationStart: registrationStart.toISOString(),
            registrationEnd: registrationEnd.toISOString(),
            tournamentStart: tournamentStart.toISOString(),
            tournamentEnd: tournamentEnd.toISOString(),
            status: 'registration_open'
        };
        
        await onCreate(tournamentData);
        setCreating(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div 
                className="modal-content create-tournament-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="modal-header">
                    <h2>🏆 Create Tournament</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className="create-form">
                    <div className="form-group">
                        <label>Tournament Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            required
                            placeholder="Enter tournament name..."
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            required
                            placeholder="Describe the tournament..."
                            rows="3"
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Tournament Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                            >
                                <option value="single_elimination">Single Elimination</option>
                                <option value="round_robin">Round Robin</option>
                                <option value="swiss_system">Swiss System</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                            >
                                <option value="General">General</option>
                                <option value="Science">Science</option>
                                <option value="History">History</option>
                                <option value="Math">Math</option>
                                <option value="Literature">Literature</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Tournament Settings */}
                    <div className="tournament-settings">
                        <h4>Tournament Settings</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Max Participants</label>
                                <select
                                    value={formData.settings.maxParticipants}
                                    onChange={(e) => handleInputChange('settings.maxParticipants', parseInt(e.target.value))}
                                >
                                    <option value={16}>16</option>
                                    <option value={32}>32</option>
                                    <option value={64}>64</option>
                                    <option value={128}>128</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Entry Fee (XP)</label>
                                <input
                                    type="number"
                                    value={formData.settings.entryFee}
                                    onChange={(e) => handleInputChange('settings.entryFee', parseInt(e.target.value))}
                                    min="0"
                                    max="500"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Duration (days)</label>
                                <input
                                    type="number"
                                    value={formData.settings.duration}
                                    onChange={(e) => handleInputChange('settings.duration', parseInt(e.target.value))}
                                    min="1"
                                    max="30"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Time Limit per Quiz (seconds)</label>
                                <input
                                    type="number"
                                    value={formData.settings.timeLimit}
                                    onChange={(e) => handleInputChange('settings.timeLimit', parseInt(e.target.value))}
                                    min="60"
                                    max="1800"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Quiz Selection */}
                    <div className="quiz-selection">
                        <h4>Select Quizzes for Tournament {availableQuizzes.length > 0 && `(${availableQuizzes.length} available)`}</h4>
                        {formData.selectedQuizzes.length > 0 && (
                            <p className="selected-count">
                                {formData.selectedQuizzes.length} quiz{formData.selectedQuizzes.length !== 1 ? 'es' : ''} selected
                            </p>
                        )}
                        {availableQuizzes.length > 5 && (
                            <p className="scroll-hint">
                                💡 Tip: Scroll down to see more quizzes ({availableQuizzes.length} total)
                            </p>
                        )}
                        {loadingQuizzes ? (
                            <p>Loading available quizzes...</p>
                        ) : availableQuizzes.length > 0 ? (
                            <div className="quiz-list">
                                {availableQuizzes.map(quiz => (
                                    <label 
                                        key={quiz._id} 
                                        className={`quiz-checkbox ${formData.selectedQuizzes.includes(quiz._id) ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedQuizzes.includes(quiz._id)}
                                            onChange={(e) => {
                                                const quizId = quiz._id;
                                                if (e.target.checked) {
                                                    // Avoid duplicates
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        selectedQuizzes: prev.selectedQuizzes.includes(quizId) 
                                                            ? prev.selectedQuizzes 
                                                            : [...prev.selectedQuizzes, quizId]
                                                    }));
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        selectedQuizzes: prev.selectedQuizzes.filter(id => id !== quizId)
                                                    }));
                                                }
                                            }}
                                        />
                                        <div className="quiz-info">
                                            <span className="quiz-title">{quiz.title}</span>
                                            <span className="quiz-details">
                                                {quiz.category} • {quiz.questions?.length || 0} questions
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="no-quizzes">No quizzes available. Please create some quizzes first.</p>
                        )}
                    </div>
                    
                    {/* Prizes */}
                    <div className="tournament-prizes-form">
                        <h4>Prize Distribution</h4>
                        {formData.prizes.map((prize, index) => (
                            <div key={index} className="prize-row">
                                <span className="prize-position">{prize.position === 1 ? '🥇' : prize.position === 2 ? '🥈' : '🥉'} {prize.position}st Place</span>
                                <div className="prize-inputs">
                                    <input
                                        type="number"
                                        value={prize.xp}
                                        onChange={(e) => handlePrizeChange(index, 'xp', parseInt(e.target.value))}
                                        placeholder="XP"
                                        min="0"
                                    />
                                    <input
                                        type="text"
                                        value={prize.badge || ''}
                                        onChange={(e) => handlePrizeChange(index, 'badge', e.target.value)}
                                        placeholder="Badge name"
                                    />
                                    {index === 0 && (
                                        <input
                                            type="text"
                                            value={prize.title || ''}
                                            onChange={(e) => handlePrizeChange(index, 'title', e.target.value)}
                                            placeholder="Winner title"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="create-btn" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Tournament'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// GameQuizModal Component for taking quizzes within gamification
const GameQuizModal = ({ 
    isOpen, 
    onClose, 
    quiz, 
    onSubmit, 
    quizType, 
    gamificationTitle 
}) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quizStartTime] = useState(Date.now());

    useEffect(() => {
        if (quiz && isOpen) {
            setTimeLeft(quiz.timeLimit || quiz.duration * 60 || 300); // Use timeLimit from backend or fallback to duration * 60 or 5 minutes
            setCurrentQuestion(0);
            setAnswers({});
        }
    }, [quiz, isOpen]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const handleAnswerSelect = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));
    };

    const handleNext = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const calculateScore = useCallback(() => {
        if (!quiz || !quiz.questions) return 0;
        let correct = 0;
        quiz.questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correct++;
            }
        });
        return Math.round((correct / quiz.questions.length) * 100);
    }, [quiz, answers]);

    const handleSubmitQuiz = useCallback(async () => {
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        const score = calculateScore();
        const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
        
        try {
            await onSubmit(answers, score, timeTaken);
            onClose();
        } catch (error) {
            console.error('Error submitting quiz:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, calculateScore, quizStartTime, onSubmit, onClose, answers]);

    // Timer effect - now placed after handleSubmitQuiz is defined
    useEffect(() => {
        if (!isOpen || timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isOpen, handleSubmitQuiz]);

    if (!isOpen || !quiz || !quiz.questions || quiz.questions.length === 0) return null;

    const currentQ = quiz.questions[currentQuestion];
    if (!currentQ) return null;
    
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
        <div className="game-quiz-modal-overlay">
            <div className="game-quiz-modal">
                <div className="quiz-header">
                    <div className="quiz-info">
                        <h3>{quiz.title}</h3>
                        <p className="quiz-type">{quizType === 'challenge' ? '🏆 Daily Challenge' : '🎯 Tournament'}: {gamificationTitle}</p>
                    </div>
                    <div className="quiz-stats">
                        <div className="timer">⏱️ {formatTime(timeLeft)}</div>
                        <div className="progress">
                            Question {currentQuestion + 1} of {quiz.questions.length}
                        </div>
                    </div>
                </div>

                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="question-container">
                    <h4 className="question-text">{currentQ.question}</h4>
                    
                    <div className="options-container">
                        {currentQ.options.map((option, index) => (
                            <button
                                key={index}
                                className={`option-btn ${answers[currentQuestion] === index ? 'selected' : ''}`}
                                onClick={() => handleAnswerSelect(index)}
                            >
                                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                <span className="option-text">{option}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="quiz-navigation">
                    <button 
                        className="nav-btn prev-btn" 
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0}
                    >
                        ← Previous
                    </button>
                    
                    <div className="nav-center">
                        <div className="question-indicator">
                            {quiz.questions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`indicator-dot ${
                                        index === currentQuestion ? 'current' : 
                                        answers[index] !== undefined ? 'answered' : ''
                                    }`}
                                    onClick={() => setCurrentQuestion(index)}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {currentQuestion === quiz.questions.length - 1 ? (
                        <button 
                            className="nav-btn submit-btn" 
                            onClick={handleSubmitQuiz}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    ) : (
                        <button 
                            className="nav-btn next-btn" 
                            onClick={handleNext}
                        >
                            Next →
                        </button>
                    )}
                </div>

                <button className="close-quiz-btn" onClick={onClose}>
                    ✕
                </button>
            </div>
        </div>
    );
};

export default GamificationHub;
