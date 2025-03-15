import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../App.css";
import "./TakeQuiz.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TakeQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/quizzes/${id}`)
            .then(res => res.json())
            .then(data => {setQuiz(data);
                setTimeLeft(data.duration * 60);
            })
            .catch((err) => {console.error("Error fetching quiz:", err);
                setError("Error fetching Quiz. Try again later.");
            }).finally(() => setLoading(false));

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
            handleSubmit(); // ✅ Auto-submit when time runs out
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer); // Cleanup on unmount
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

    const handleAnswer = (optionIndex) => {
        const optionLetter = ["A", "B", "C", "D"][optionIndex];
        setAnswers({ ...answers, [currentQuestion]: optionLetter });
    };

    const handleClearAnswer = () => {
        const updatedAnswers = { ...answers };
        delete updatedAnswers[currentQuestion];
        setAnswers(updatedAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleSubmit = async () => {
        let correctCount = 0;
    
        // ✅ Create detailed questions array
        const detailedQuestions = quiz.questions.map((q, index) => {
            const userAnswer = answers[index] || "Not Answered"; // Handle unanswered questions
            const correctAnswer = q.correctAnswer;
    
            if (userAnswer === correctAnswer) {
                correctCount++;
            }
    
            return { questionText: q.question, userAnswer, correctAnswer };
        });
    
        const totalMarks = quiz.totalMarks;
        const scoreAchieved = (correctCount / quiz.questions.length) * totalMarks;
        setScore(scoreAchieved);
    
        const user = JSON.parse(localStorage.getItem("user"));
    
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user?.name,
                    quizName: quiz.title,
                    score: scoreAchieved,
                    total: totalMarks,
                    questions: detailedQuestions, // ✅ Send questions array
                }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to save report");
            }
            if(timeLeft <= 0){
                alert(`Time's up! Your quiz has been auto-submitted. ${scoreAchieved} out of ${totalMarks}`);
            }
            else{
                alert(`You scored ${scoreAchieved} out of ${totalMarks}`);
            }
            navigate("/user/report");
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Failed to save your score. Please try again.");
        }
    };    

    if (loading) return <p>Loading Quiz...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="quiz-container">
            {quiz ? (
                <>
                    <h1>{quiz.title}</h1>
                    <div className="timer">Time Left: {formatTime(timeLeft)}</div>
                    <div className="question-box">
                        <p className="question">{quiz.questions[currentQuestion].question}</p>
                        <div className="options">
                            {quiz.questions[currentQuestion].options.map((option, i) => (
                                <button
                                    key={i}
                                    className={answers[currentQuestion] === ["A", "B", "C", "D"][i] ? "selected" : ""}
                                    onClick={() => handleAnswer(i)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="navigation-buttons">
                        <button onClick={handlePrev} disabled={currentQuestion === 0}>Previous</button>
                        <button onClick={handleClearAnswer}>Clear Answer</button>
                        <button 
                            onClick={handleNext} 
                            disabled={currentQuestion === quiz.questions.length - 1}
                            className={currentQuestion === quiz.questions.length - 1 ? "disabled-btn" : ""}
                        >
                            Next
                        </button>
                        <button onClick={handleSubmit}>Submit Quiz</button>
                    </div>
                </>
            ) : <p>Loading quiz...</p>}
        </div>
    );
};

export default TakeQuiz;