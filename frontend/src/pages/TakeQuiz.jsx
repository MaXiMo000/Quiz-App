import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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

    // Auto-submit functionality
    const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
    const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
    const [isQuizInitialized, setIsQuizInitialized] = useState(false);
    const [autoSubmitReason, setAutoSubmitReason] = useState(null);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const autoSubmitRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const autoSubmitQuizRef = useRef(null);
    const answersLengthRef = useRef(0);
    const isSubmitButtonClicked = useRef(false);

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    const optionLetters = useMemo(() => ["A", "B", "C", "D"], []);
    const currentQ = useMemo(() => quiz?.questions?.[currentQuestion], [quiz, currentQuestion]);

    const fetchQuiz = useCallback(async (isRetry = false) => {
        try {
            setLoading(true);
            if (isRetry) {
                setError("");
                setRetryCount(prev => prev + 1);
            }

            const res = await axios.get(`/api/quizzes/${id}`);
            if (res.data && res.data.questions && res.data.questions.length > 0) {
                setQuiz(res.data);
                setTimeLeft(res.data.duration * 60);
                setError("");
                setRetryCount(0);
            } else {
                setError("Quiz data is incomplete or invalid.");
            }
        } catch (error) {
            console.error("Error fetching quiz:", error);
            if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
                if (retryCount < 3) {
                    setError(`Network error. Retrying... (${retryCount + 1}/3)`);
                    setTimeout(() => fetchQuiz(true), 2000);
                    return;
                } else {
                    setError("Network error. Please check your connection and try again.");
                }
            } else if (error.response?.status === 404) {
                setError("Quiz not found. It may have been deleted or the link is invalid.");
            } else if (error.response?.status === 500) {
                setError("Server error. Please try again later.");
            } else {
                setError("Error fetching quiz. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    }, [id, retryCount]);

    useEffect(() => {
        fetchQuiz();
    }, [fetchQuiz]);

    // Define exitFullScreen early to avoid circular dependency
    const exitFullScreen = useCallback(() => {
        // Auto-submit before exiting fullscreen
        if (!hasAutoSubmitted && !isSubmittingRef.current && autoSubmitQuizRef.current) {
            autoSubmitQuizRef.current("Close button clicked");
        }

        // Exit fullscreen with error handling
        try {
            // Check if document is still active before trying to exit fullscreen
            if (document.visibilityState === 'visible' && document.hasFocus()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
            }
        } catch {
            // Silently handle fullscreen exit errors
        }
        setIsFullScreen(false);
    }, [hasAutoSubmitted]);

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
                // Mobile Chrome specific fixes
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
                // Prevent mobile Chrome zoom
                document.documentElement.style.touchAction = 'manipulation';
            } else {
                document.body.classList.remove('quiz-fullscreen');
                // Reset mobile Chrome fixes
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
                document.documentElement.style.touchAction = '';

                // Check if this was caused by Escape key (auto-submit scenario)
                // Small delay to ensure the fullscreen change is complete
                setTimeout(() => {
                    // Check if this was an escape key exit by seeing if we're not in fullscreen
                    const stillNotFullscreen = !(
                        document.fullscreenElement ||
                        document.mozFullScreenElement ||
                        document.webkitFullscreenElement ||
                        document.msFullscreenElement
                    );

                    if (stillNotFullscreen && !hasAutoSubmitted && !isSubmittingRef.current && !isSubmitButtonClicked.current) {
                        if (autoSubmitQuizRef.current) {
                            autoSubmitQuizRef.current("Escape key pressed");
                        }
                    } else if (isSubmitButtonClicked.current) {
                        isSubmitButtonClicked.current = false; // Reset flag
                    }
                }, 100);
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
            if (isCurrentlyFullscreen) {
                setIsFullScreen(true);
                document.body.classList.add('quiz-fullscreen');
            }
        };

        // Check initial state with a small delay to ensure proper detection after navigation
        setTimeout(checkInitialFullscreen, 100);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (autoSubmitQuizRef.current) {
                    autoSubmitQuizRef.current("Escape key pressed");
                } else {
                    exitFullScreen();
                }
                // Still exit fullscreen after auto-submit
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
            // Reset mobile Chrome fixes
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.style.touchAction = '';
        };
    }, [exitFullScreen, hasAutoSubmitted]); // Add exitFullScreen and hasAutoSubmitted dependencies

    // Record answer time function
    const recordAnswerTime = useCallback(() => {
        const timeSpent = (Date.now() - questionStartTime) / 1000;
        setAnswerTimes(prev => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + timeSpent
        }));
        setQuestionStartTime(Date.now());
    }, [questionStartTime, currentQuestion]);

    // Auto-submit function for interruption scenarios
    const autoSubmitQuiz = useCallback(async (reason = "Quiz interrupted") => {
        // Set ref for exitFullScreen to use
        autoSubmitQuizRef.current = autoSubmitQuiz;

        // Prevent multiple auto-submits
        if (autoSubmitRef.current || isSubmittingRef.current || hasAutoSubmitted) {
            return;
        }

        autoSubmitRef.current = true;
        isSubmittingRef.current = true;
        setIsAutoSubmitting(true);
        setHasAutoSubmitted(true);
        setAutoSubmitReason(reason);

        // Calculate score and questions outside try block for fallback access
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
        const scoreAchieved = Math.round((correctCount / quiz.questions.length) * totalMarks * 100) / 100;

        try {
            // Record current question time before submitting
            recordAnswerTime();

            // Update UI states (same as regular submit)
            setScore(scoreAchieved);
            setFinalScore(totalMarks);
            setPerformanceLevel(
                scoreAchieved >= totalMarks * 0.7 ? "high"
                : scoreAchieved >= totalMarks * 0.4 ? "medium"
                : "low"
            );

            // Save the report with error handling
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                await axios.post(`/api/reports`, {
                    username: user?.name,
                    quizName: quiz.title,
                    score: scoreAchieved,
                    total: totalMarks,
                    questions: detailedQuestions,
                    autoSubmitted: true,
                    reason: reason
                });
            } catch (reportError) {
                console.warn("Could not save report:", reportError.message);
            }

            // Update quiz statistics with error handling
            try {
                const totalTimeSpent = Object.values(answerTimes).reduce((sum, time) => sum + time, 0);
                await axios.post(`/api/quizzes/${id}/stats`, {
                    quizId: id,
                    score: scoreAchieved,
                    totalQuestions: quiz.questions.length,
                    timeSpent: totalTimeSpent
                });
            } catch (statsError) {
                console.warn("Could not update quiz stats:", statsError.message);
            }

            // Update user preferences with error handling
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                if (user?._id) {
                    const totalTimeSpent = Object.values(answerTimes).reduce((sum, time) => sum + time, 0);
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
            } catch (preferencesError) {
                console.warn("Could not update user preferences:", preferencesError.message);
            }

            // Refresh user data with error handling
            try {
                const updatedUserRes = await axios.get('/api/users/me');
                localStorage.setItem("user", JSON.stringify(updatedUserRes.data));
            } catch (userError) {
                console.warn("Could not refresh user data:", userError.message);
            }

            // Mark quiz as completed and show result modal
            setIsQuizCompleted(true);
            setShowResultModal(true);


        } catch (error) {
            console.error("Error auto-submitting quiz:", error);

            // Fallback: Save quiz data locally if backend fails
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                const totalTimeSpent = Object.values(answerTimes).reduce((sum, time) => sum + time, 0);
                const localQuizData = {
                    username: user?.name,
                    quizName: quiz.title,
                    score: scoreAchieved,
                    total: totalMarks,
                    questions: detailedQuestions,
                    autoSubmitted: true,
                    reason: reason,
                    timestamp: new Date().toISOString(),
                    timeSpent: totalTimeSpent
                };

                // Save to localStorage as backup
                const existingData = JSON.parse(localStorage.getItem('pendingQuizSubmissions') || '[]');
                existingData.push(localQuizData);
                localStorage.setItem('pendingQuizSubmissions', JSON.stringify(existingData));


                // Mark quiz as completed and show result modal even if backend failed
                setIsQuizCompleted(true);
                setShowResultModal(true);

            } catch (fallbackError) {
                console.error("Failed to save quiz data locally:", fallbackError);
            }
        } finally {
            setIsAutoSubmitting(false);
            isSubmittingRef.current = false;
        }
    }, [quiz, answers, answerTimes, optionLetters, id, recordAnswerTime, hasAutoSubmitted]);

    // Auto-submit event listeners
    useEffect(() => {
        if (!quiz || hasAutoSubmitted) return;

        // Escape key handler is now handled in the main fullscreen useEffect

        // Page unload handler (browser close, refresh, navigation)
        const handleBeforeUnload = (_event) => {
            if (!hasAutoSubmitted && !isSubmittingRef.current) {
                // Use sendBeacon for reliable data sending on page unload
                const user = JSON.parse(localStorage.getItem("user"));
                if (user && quiz) {
                    // Calculate score properly before sending
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
                    const scoreAchieved = Math.round((correctCount / quiz.questions.length) * totalMarks * 100) / 100;

                    const data = {
                        username: user.name,
                        quizName: quiz.title,
                        score: scoreAchieved,
                        total: totalMarks,
                        questions: detailedQuestions,
                        autoSubmitted: true,
                        reason: "Page unload"
                    };

                    // Send data using sendBeacon
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    navigator.sendBeacon(`/api/reports`, blob);
                }
            }
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [quiz, hasAutoSubmitted, autoSubmitQuiz, navigate, answers, answerTimes, optionLetters, exitFullScreen]);

    // Initialize quiz after a short delay to prevent false auto-submits
    useEffect(() => {
        if (quiz) {
            const timer = setTimeout(() => {
                setIsQuizInitialized(true);
            }, 1000); // 1 second delay to ensure quiz is properly loaded

            return () => clearTimeout(timer);
        }
    }, [quiz]);

    // Set autoSubmitQuizRef early to ensure it's available
    useEffect(() => {
        if (autoSubmitQuiz) {
            autoSubmitQuizRef.current = autoSubmitQuiz;
        }
    }, [autoSubmitQuiz]);

    // Also set ref immediately when autoSubmitQuiz changes (for immediate availability)
    if (autoSubmitQuiz) {
        autoSubmitQuizRef.current = autoSubmitQuiz;
    }

    // Update answers length ref whenever answers change
    answersLengthRef.current = answers.length;

    // Route change detection - only trigger when component unmounts due to navigation
    useEffect(() => {
        if (!quiz || hasAutoSubmitted || !isQuizInitialized) return;

        // This cleanup function will only run when the component unmounts
        return () => {
            // Only auto-submit if user has started the quiz (quiz is loaded and initialized)
            // AND if there are actual answers (user has interacted with the quiz)
            if (!hasAutoSubmitted && !isSubmittingRef.current && quiz && isQuizInitialized && answersLengthRef.current > 0) {
                autoSubmitQuiz("Route changed");
            }
        };
    }, [quiz, hasAutoSubmitted, autoSubmitQuiz, isQuizInitialized]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    // Fixed: handleSubmit defined before useEffect that uses it
    const handleSubmit = useCallback(async () => {
        // Set flag to indicate submit button was clicked
        isSubmitButtonClicked.current = true;

        // Prevent submission if already auto-submitted or currently auto-submitting
        if (hasAutoSubmitted || isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
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

                await axios.post('/api/intelligence/track-performance', {
                    quizId: id,
                    score: scoreAchieved,
                    totalQuestions: quiz.questions.length,
                    timeSpent: totalTimeSpent,
                });
            }

            // ✅ Refresh user data to get updated XP and level
            try {
                const updatedUserRes = await axios.get('/api/users/me');
                localStorage.setItem("user", JSON.stringify(updatedUserRes.data));
            } catch (userError) {
                console.warn("Could not refresh user data:", userError);
            }

            // Mark quiz as completed and stop timer
            setIsQuizCompleted(true);
            setShowResultModal(true);
            exitFullScreen();
        } catch (error) {
            console.error("Error saving report:", error);
            showError("Failed to save your score. Please try again.");
        } finally {
            isSubmittingRef.current = false;
        }
    }, [quiz, answers, answerTimes, optionLetters, showError, id, recordAnswerTime, hasAutoSubmitted, exitFullScreen]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        // Stop timer if quiz is completed, submitted, or result modal is showing
        if (isQuizCompleted || hasAutoSubmitted || showResultModal || isSubmittingRef.current) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, handleSubmit, isQuizCompleted, hasAutoSubmitted, showResultModal]);



    // SAVE THE INDEX, NOT THE LETTER
    const handleAnswer = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));

        const question = quiz.questions[currentQuestion];
        const correctOptionIndex = optionLetters.indexOf(question.correctAnswer);
        const quality = optionIndex === correctOptionIndex ? 5 : 1; // 5 for correct, 1 for incorrect

        axios.post('/api/reviews/update', {
            quizId: id,
            questionId: question._id,
            quality: quality,
        }).catch(error => {
            console.error("Error updating review schedule:", error);
        });
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
    if (error) return (
        <div className="error-container">
            <p className="error-message">{error}</p>
            {error.includes('Network error') && retryCount < 3 && (
                <button
                    className="retry-button"
                    onClick={() => fetchQuiz(true)}
                    disabled={loading}
                >
                    {loading ? 'Retrying...' : 'Retry'}
                </button>
            )}
            {error.includes('Network error') && retryCount >= 3 && (
                <button
                    className="retry-button"
                    onClick={() => {
                        setRetryCount(0);
                        fetchQuiz(true);
                    }}
                    disabled={loading}
                >
                    Try Again
                </button>
            )}
        </div>
    );
    if (isAutoSubmitting) return <Spinner message="Auto-submitting quiz..." />;

    // Add null checks for quiz data
    if (!quiz) return <Spinner message="Loading quiz data..." />;
    if (!currentQ) return <Spinner message="Loading question..." />;

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
            {!isQuizCompleted && !showResultModal && (
                <div className="timer">Time Left: {formatTime(timeLeft)}</div>
            )}

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

                        {autoSubmitReason && (
                            <div className="auto-submit-notice">
                                <div className="notice-icon">⚠️</div>
                                <div className="notice-content">
                                    <strong>Quiz Auto-Submitted</strong>
                                    <p>Reason: {autoSubmitReason}</p>
                                </div>
                            </div>
                        )}

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
