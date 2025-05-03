import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../App.css";
import "./TakeQuiz.css";
import axios from "../utils/axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

    const optionLetters = useMemo(() => ["A", "B", "C", "D"], []);
    const currentQ = useMemo(() => quiz?.questions?.[currentQuestion], [quiz, currentQuestion]);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/quizzes/${id}`);
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
        enterFullScreen();
    }, [id]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

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
    }, [timeLeft]);

    const enterFullScreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
        else if (element.msRequestFullscreen) element.msRequestFullscreen();
        setIsFullScreen(true);
    };

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

    const recordAnswerTime = () => {
        const timeSpent = (Date.now() - questionStartTime) / 1000;
        setAnswerTimes(prev => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + timeSpent
        }));
        setQuestionStartTime(Date.now());
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

    const handleSubmit = async () => {
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
        const scoreAchieved = (correctCount / quiz.questions.length) * totalMarks;
        setScore(scoreAchieved);
        setFinalScore(totalMarks);
        setPerformanceLevel(
            scoreAchieved >= totalMarks * 0.7 ? "high"
            : scoreAchieved >= totalMarks * 0.4 ? "medium"
            : "low"
        );

        try {
            const user = JSON.parse(localStorage.getItem("user"));
            await axios.post(`${BACKEND_URL}/api/reports`, {
                username: user?.name,
                quizName: quiz.title,
                score: scoreAchieved,
                total: totalMarks,
                questions: detailedQuestions,
            });
            setShowResultModal(true);
            exitFullScreen();
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Failed to save your score. Please try again.");
        }
    };

    if (loading) return <p>Loading Quiz...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="quiz-container">
            <h1>{quiz.title}</h1>
            <div className="timer">Time Left: {formatTime(timeLeft)}</div>

            <div className="question-box">
                <p className="question">{currentQ.question}</p>
                <div className="options">
                    {currentQ.options.map((option, i) => (
                        <button
                            key={i}
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

            {showResultModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <p>You scored <strong>{score}</strong> out of <strong>{finalScore}</strong>.</p>
                        <p>Would you like to generate more questions based on your performance?</p>
                        <div className="modal-actions">
                            <button onClick={() => navigate(`/adaptive/${id}?performance=${performanceLevel}`)}>Generate More</button>
                            <button onClick={() => navigate("/user/report")}>Go to Reports</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeQuiz;