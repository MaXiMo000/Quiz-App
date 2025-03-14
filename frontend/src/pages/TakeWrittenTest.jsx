import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../App.css";
import "./TakeWrittenTest.css"; // ✅ Importing the new CSS file

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TakeWrittenTest = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [answers, setAnswers] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/written-tests/${id}`)
            .then(res => res.json())
            .then(data => {
                setTest(data);
                setTimeLeft(data.duration * 60);
            })
            .catch(error => console.error("Error fetching written test:", error));

        enterFullScreen();
    }, [id]);

    // ✅ Timer Countdown
    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // ✅ Convert seconds to minutes:seconds format
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    // ✅ Enter Fullscreen Mode
    const enterFullScreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
        else if (element.msRequestFullscreen) element.msRequestFullscreen();
        setIsFullScreen(true);
    };

    // ✅ Exit Fullscreen Mode
    const exitFullScreen = () => {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        setIsFullScreen(false);
    };

    // ✅ Navigate to the Next Question
    const handleNext = () => {
        if (currentQuestion < test.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    // ✅ Navigate to the Previous Question
    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    // ✅ Submit Written Test

    const handleSubmit = async () => {
        let totalScore = 0;
        let totalMarks = test.totalMarks;
        let validResponses = 0;

        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) {
            alert("User not found. Please log in.");
            return;
        }

        let scoredQuestions = [];

        for (const index in test.questions) {
            const questionText = test.questions[index].question;
            const userAnswer = answers[index] || "";

            try {
                const response = await fetch(`${BACKEND_URL}/api/written-tests/score-answer`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question: questionText, answer: userAnswer }),
                });

                if (!response.ok) {
                    throw new Error(`Error scoring answer: ${response.status}`);
                }

                const data = await response.json();
                if (data.score !== undefined && !isNaN(data.score)) {
                    totalScore += parseFloat(data.score);
                    validResponses++;

                    scoredQuestions.push({
                        questionText,
                        userAnswer,
                        correctAnswer: "N/A (Subjective Answer)",
                    });
                }
            } catch (error) {
                console.error("Error scoring answer:", error.message);
            }
        }

        // ✅ Prevent division by zero & ensure score is valid
        if (validResponses === 0) {
            setScore(0);
            alert("Failed to score the test. Please try again.");
            return;
        }

        setScore(totalScore);
        alert(`You scored ${totalScore} out of ${totalMarks}`);

        // ✅ Store report in the database
        try {
            await fetch(`${BACKEND_URL}/api/written-test-reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user.name,
                    testName: test.title,
                    score: totalScore,
                    total: totalMarks,
                    questions: scoredQuestions,
                }),
            });

            // alert("Report saved successfully!");
        } catch (error) {
            console.error("Error saving written test report:", error);
        }

        navigate("/user/written-reports");
    };
    

    if (!test) return <h2>Loading...</h2>;

    return (
        <div className="written-test-container">
            <h1>{test.title}</h1>
            <div className="timer">Time Left: {formatTime(timeLeft)}</div>

            <div className="question-box">
                <h3>Question {currentQuestion + 1}:</h3>
                <p>{test.questions[currentQuestion].question}</p>
                <textarea
                    rows="5"
                    placeholder="Write your answer here..."
                    value={answers[currentQuestion] || ""}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
                />
            </div>

            <div className="navigation-buttons">
                <button onClick={handlePrev} disabled={currentQuestion === 0}>Previous</button>
                <button 
                    onClick={handleNext} 
                    disabled={currentQuestion === test.questions.length - 1}
                >
                    Next
                </button>
                <button onClick={handleSubmit}>Submit Test</button>
            </div>

            <div className="fullscreen-toggle">
                <button onClick={isFullScreen ? exitFullScreen : enterFullScreen}>
                    {isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                </button>
            </div>

            {score !== null && <h2>Your Score: {score}/{test.totalMarks}</h2>}
        </div>
    );
};

export default TakeWrittenTest;