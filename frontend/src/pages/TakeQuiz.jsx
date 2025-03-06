import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../app.css";
import "./TakeQuiz.css";

const TakeQuiz = () => {
    const { id } = useParams(); // Get quiz ID from URL
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:5000/api/quizzes/${id}`)
            .then(res => res.json())
            .then(data => setQuiz(data))
            .catch(error => console.error("Error fetching quiz:", error));
    }, [id]);

    const handleAnswer = (questionIndex, optionIndex) => {
        const optionLetter = ["A", "B", "C", "D"][optionIndex]; // Convert index to letter
        setAnswers({ ...answers, [questionIndex]: optionLetter });
    };
    
    const handleSubmit = async () => {
        let correctCount = 0;
    
        console.log("User Answers:", answers);  // Log user's selected answers
        console.log("Quiz Questions:", quiz.questions); // Log quiz questions
    
        quiz.questions.forEach((q, index) => {
            console.log(`Question ${index + 1}:`);
            console.log("Selected Answer:", answers[index]);  // Logs the stored letter (A, B, C, D)
            console.log("Correct Answer:", q.correctAnswer);  // Logs the correct letter (A, B, C, D)
    
            // Ensure answers are compared correctly (case-sensitive check not needed now)
            if (answers[index] === q.correctAnswer) {
                correctCount++;
            }
        });
    
        const totalMarks = quiz.totalMarks;
        const scoreAchieved = (correctCount / quiz.questions.length) * totalMarks;
        setScore(scoreAchieved);
    
        console.log(`Correct Count: ${correctCount}`);
        console.log(`Final Score: ${scoreAchieved} / ${totalMarks}`);
    
        // Save report in database
        const user = JSON.parse(localStorage.getItem("user"));
        try {
            const response = await fetch("http://localhost:5000/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user?.name,
                    quizName: quiz.title,
                    score: scoreAchieved,
                    total: totalMarks,
                }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to save report");
            }
    
            alert(`You scored ${scoreAchieved} out of ${totalMarks}`);
            navigate("/user/report");
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Failed to save your score. Please try again.");
        }
    };
    

    return (
        <div className="container">
            {quiz ? (
                <>
                    <h1>{quiz.title}</h1>
                    {quiz.questions.map((q, index) => (
                        <div key={index}>
                            <p>{q.question}</p>
                            {q.options.map((option, i) => (
                                <button key={i} onClick={() => handleAnswer(index, i)}>
                                {option}
                                </button>
                            ))}
                        </div>
                    ))}
                    <button onClick={handleSubmit}>Submit Quiz</button>
                </>
            ) : <p>Loading quiz...</p>}
        </div>
    );
};

export default TakeQuiz;