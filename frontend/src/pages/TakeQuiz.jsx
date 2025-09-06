import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../App.css";
import "./TakeQuiz.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const TakeQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({}); // holds indices now
    const [score, setScore] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showResultModal, setShowResultModal] = useState(false);
    const [finalScore, setFinalScore] = useState(null);
    const [performanceLevel, setPerformanceLevel] = useState("medium");
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [answerTimes, setAnswerTimes] = useState({});

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    const optionLetters = useMemo(() => ["A", "B", "C", "D"], []);
    const currentQ = useMemo(() => quiz?.questions?.[currentQuestion], [quiz, currentQuestion]);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await axios.get(`/api/quizzes/${id}`);
                setQuiz(res.data);
                setTimeLeft(res.data.duration * 60);
            } catch (error) {
                console.error("Error fetching quiz:", error);
                setError("Error fetching quiz. Try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
            setIsFullScreen(isCurrentlyFullscreen);
            
            // Add/remove fullscreen class to body for better CSS targeting
            if (isCurrentlyFullscreen) {
                document.body.classList.add('quiz-fullscreen');
                console.log("Fullscreen mode activated");
                // Verify class was added
                setTimeout(() => {
                    console.log("Body classes after adding quiz-fullscreen:", document.body.className);
                    console.log("Quiz-fullscreen class present:", document.body.classList.contains('quiz-fullscreen'));
                }, 50);
            } else {
                document.body.classList.remove('quiz-fullscreen');
                console.log("Fullscreen mode deactivated");
            }
        };

        // Check initial fullscreen state on mount
        const checkInitialFullscreen = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
            console.log("Checking initial fullscreen state:", {
                fullscreenElement: document.fullscreenElement,
                mozFullScreenElement: document.mozFullScreenElement,
                webkitFullscreenElement: document.webkitFullscreenElement,
                msFullscreenElement: document.msFullscreenElement,
                isCurrentlyFullscreen
            });
            if (isCurrentlyFullscreen) {
                setIsFullScreen(true);
                document.body.classList.add('quiz-fullscreen');
                console.log("Fullscreen mode already active on mount");
                // Verify class was added
                setTimeout(() => {
                    console.log("Body classes after adding quiz-fullscreen:", document.body.className);
                    console.log("Quiz-fullscreen class present:", document.body.classList.contains('quiz-fullscreen'));
                }, 50);
            }
        };

        // Check initial state with a small delay to ensure proper detection after navigation
        setTimeout(checkInitialFullscreen, 100);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                const isCurrentlyFullscreen = !!(
                    document.fullscreenElement ||
                    document.mozFullScreenElement ||
                    document.webkitFullscreenElement ||
                    document.msFullscreenElement
                );
                if (isCurrentlyFullscreen) {
                    exitFullScreen();
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown);
            // Clean up class on unmount
            document.body.classList.remove('quiz-fullscreen');
            console.log("Fullscreen mode deactivated");
        };
    }, []); // Remove isFullScreen dependency to prevent re-running

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const recordAnswerTime = useCallback(() => {
        const timeSpent = (Date.now() - questionStartTime) / 1000;
        setAnswerTimes(prev => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + timeSpent
        }));
        setQuestionStartTime(Date.now());
    }, [questionStartTime, currentQuestion]);

    // Fixed: handleSubmit defined before useEffect that uses it
    const handleSubmit = useCallback(async () => {
        recordAnswerTime();
        let correctCount = 0;

        const detailedQuestions = quiz.questions.map((q, idx) => {
            const chosenIdx = answers[idx];
            const userAnswer = chosenIdx != null ? optionLetters[chosenIdx] : "Not Answered";
            const userAnswerText = chosenIdx != null ? q.options[chosenIdx] : "Not Answered";

            const correctIdx = optionLetters.indexOf(q.correctAnswer);
            const correctAnswerText = q.options[correctIdx];

            if (userAnswer === q.correctAnswer) correctCount++;

            return {
                questionText: q.question,
                options: q.options,
                userAnswer,
                userAnswerText,
                correctAnswer: q.correctAnswer,
                correctAnswerText,
                answerTime: answerTimes[idx] || 0
            };
        });

        const totalMarks = quiz.totalMarks;
        const scoreAchieved = Math.round((correctCount / quiz.questions.length) * totalMarks * 100) / 100; // Round to 2 decimal places
        setScore(scoreAchieved);
        setFinalScore(totalMarks);
        setPerformanceLevel(
            scoreAchieved >= totalMarks * 0.7 ? "high"
            : scoreAchieved >= totalMarks * 0.4 ? "medium"
            : "low"
        );

        try {
            const user = JSON.parse(localStorage.getItem("user"));
            
            // Save the report as before
            await axios.post(`/api/reports`, {
                username: user?.name,
                quizName: quiz.title,
                score: scoreAchieved,
                total: totalMarks,
                questions: detailedQuestions,
            });

            // Phase 2: Update quiz statistics
            const totalTimeSpent = Object.values(answerTimes).reduce((sum, time) => sum + time, 0);
            await axios.post(`/api/quizzes/${id}/stats`, {
                quizId: id,
                score: scoreAchieved,
                totalQuestions: quiz.questions.length,
                timeSpent: totalTimeSpent
            });

            // Phase 2: Update user preferences and performance tracking
            if (user?._id) {
                await axios.post('/api/intelligence/preferences', {
                    quizId: id,
                    score: scoreAchieved, 
                    totalQuestions: quiz.questions.length,
                    timeSpent: totalTimeSpent,
                    category: quiz.category || 'General',
                    difficulty: quiz.questions.length > 10 ? 'hard' : 
                               quiz.questions.length > 5 ? 'medium' : 'easy'
                });
            }

            // ✅ Refresh user data to get updated XP and level
            try {
                const updatedUserRes = await axios.get('/api/users/me');
                localStorage.setItem("user", JSON.stringify(updatedUserRes.data));
            } catch (userError) {
                console.warn("Could not refresh user data:", userError);
            }

            setShowResultModal(true);
            exitFullScreen();
        } catch (error) {
            console.error("Error saving report:", error);
            showError("Failed to save your score. Please try again.");
        }
    }, [quiz, answers, answerTimes, optionLetters, showError, id, recordAnswerTime]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, handleSubmit]);


    const exitFullScreen = () => {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        setIsFullScreen(false);
    };

    // SAVE THE INDEX, NOT THE LETTER
    const handleAnswer = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));
    };

    const handleClearAnswer = () => {
        setAnswers(prev => {
            const copy = { ...prev };
            delete copy[currentQuestion];
            return copy;
        });
    };

    const handleNext = () => {
        recordAnswerTime();
        if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        }
    };
    
    const handlePrev = () => {
        recordAnswerTime();
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    if (loading) return <Spinner message="Loading quiz..." />;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="quiz-container">
            {/* Fullscreen exit button */}
            {isFullScreen && (
                <button 
                    className="exit-fullscreen-btn"
                    onClick={exitFullScreen}
                    title="Exit Fullscreen"
                >
                    ✕
                </button>
            )}
            
            <div className="quiz-content">
                <h1>{quiz.title}</h1>
                <div className="timer">Time Left: {formatTime(timeLeft)}</div>

                <div className="question-box">
                    <p className="question">{currentQ.question}</p>
                    <div className="options">
                        {currentQ.options.map((option, i) => (
                            <button
                                key={`q${currentQuestion}-opt${i}`}
                                className={answers[currentQuestion] === i ? "selected" : ""}
                                onClick={() => handleAnswer(i)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="navigation-buttons">  
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestion === 0}
                        className={`navigation-button ${currentQuestion === 0 ? "disabled-btn" : ""}`}
                    >
                        Previous
                    </button>
                    <button onClick={handleClearAnswer}>Clear Answer</button>
                    <button
                        onClick={handleNext}
                        disabled={currentQuestion === quiz.questions.length - 1}
                        className={`navigation-button ${currentQuestion === quiz.questions.length - 1 ? "disabled-btn" : ""}`}
                    >
                        Next
                    </button>
                    <button onClick={handleSubmit}>Submit Quiz</button>
                </div>
            </div>

            {showResultModal && (
                <div className="modal-overlay">
                    <div className="modal-content result-modal">
                        <div className="result-header">
                            <div className="result-icon">🎉</div>
                            <h2>Quiz Completed!</h2>
                        </div>
                        
                        <div className="score-display">
                            <div className="score-circle">
                                <span className="score-number">{score}</span>
                                <span className="score-divider">/</span>
                                <span className="total-score">{finalScore}</span>
                            </div>
                            <div className="percentage-score">
                                {Math.round((score / finalScore) * 100)}%
                            </div>
                        </div>

                        <div className="performance-badge">
                            <span className={`badge ${performanceLevel}`}>
                                {performanceLevel === 'high' ? '🏆 Excellent!' : 
                                 performanceLevel === 'medium' ? '👍 Good Job!' : 
                                 '📚 Keep Learning!'}
                            </span>
                        </div>

                        <p className="result-message">
                            Would you like to generate more questions based on your performance?
                        </p>
                        
                        <div className="modal-actions">
                            <button 
                                className="generate-btn"
                                onClick={() => navigate(`/adaptive/${id}?performance=${performanceLevel}`)}
                            >
                                🚀 Generate More
                            </button>
                            <button 
                                className="reports-btn"
                                onClick={() => navigate("/user/report")}
                            >
                                📊 Go to Reports
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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

export default TakeQuiz;