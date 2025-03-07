import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../app.css";
import "./AdminQuizzes.css";

const AdminQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null); // Track quiz for adding questions
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState("");

    // Fetch existing quizzes
    const getQuiz = () => {
        fetch("http://localhost:5000/api/quizzes")
            .then((res) => res.json())
            .then((data) => setQuizzes(data))
            .catch((err) => console.error("Error fetching quizzes:", err));
    };
    useEffect(() => {
        getQuiz();
    }, []);

    // Function to open Add Question modal
    const openAddQuestionModal = (quizId) => {
        if (!quizId) {
            alert("Please select a quiz first!");
            return;
        }
        setSelectedQuizId(quizId);
        document.getElementById("add_question_modal").showModal();
    };

    // ✅ Open AI Question Modal
    const openAiQuestionModal = (quizId) => {
        setSelectedQuizId(quizId);
        document.getElementById("ai_question_modal").showModal();
    };

    // ✅ Handle AI-Powered Question Generation
    const handleAiSubmit = async (event) => {
        event.preventDefault();

        if (!aiTopic || aiNumQuestions <= 0) {
            alert("Please enter a valid topic and number of questions.");
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/quizzes/${selectedQuizId}/generate-questions`, {
                topic: aiTopic,
                numQuestions: Number(aiNumQuestions)
            },
            { headers: { "Content-Type": "application/json" } }
        );

            alert("AI-generated questions added successfully!");
            document.getElementById("ai_question_modal").close();
            getQuiz(); // ✅ Refresh the quiz list
        } catch (error) {
            console.error("Error generating AI questions:", error);
            alert("Failed to generate AI questions.");
        }
    };

    // Handle Quiz Creation
    const createQuiz = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const quizData = {
            title: formData.get("title"),
            category: formData.get("category"),
            duration: Number(formData.get("duration")),
            totalMarks: Number(formData.get("totalMarks")),
            passingMarks: Number(formData.get("passingMarks")),
        };

        try {
            const response = await fetch("http://localhost:5000/api/quizzes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quizData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            document.getElementById("create_quiz_modal").close();
            getQuiz(); // Refresh list
            alert("Quiz created successfully!");
        } catch (error) {
            console.error("Error creating quiz:", error);
            alert("Failed to create quiz. Check API response.");
        }
    };

    const deleteQuiz = async (title) => {
        if (!title) {
            alert("Quiz title is missing!");
            return;
        }
    
        try {
            const response = await axios.delete(`http://localhost:5000/api/quizzes/delete/quiz?title=${encodeURIComponent(title)}`);
    
            if (response.status === 200) {
                alert("Quiz deleted successfully!");
                getQuiz(); // ✅ Refresh the quiz list
            }
        } catch (error) {
            console.error("Error deleting quiz:", error);
            alert("Failed to delete quiz. Check the API response.");
        }
    };

    // Handle Adding Question
    const addQuestion = async (event) => {
        event.preventDefault();
        if (!selectedQuizId) return alert("No quiz selected!");

        const formData = new FormData(event.target);
        const questionData = {
            question: formData.get("question"),
            options: [
                formData.get("optionA"),
                formData.get("optionB"),
                formData.get("optionC"),
                formData.get("optionD"),
            ],
            correctAnswer: formData.get("correctAnswer").toUpperCase(),
        };

        try {
            const response = await fetch(`http://localhost:5000/api/quizzes/${selectedQuizId}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(questionData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            document.getElementById("add_question_modal").close();
            getQuiz(); // Refresh list
            alert("Question added successfully!");
        } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question. Check API response.");
        }
    };

    return (
        <div className="quiz-container">
            <h2>📚 Manage Quizzes</h2>
            <button className="create-btn" onClick={() => document.getElementById("create_quiz_modal").showModal()}>
                ➕ Create Quiz
            </button>

            <ul>
                {quizzes.map((quiz) => (
                    <li key={quiz._id} className="quiz-box">
                        <h3>{quiz.title}</h3>
                        <p>Category: {quiz.category}</p>
                        <p>Duration: {quiz.duration} minutes</p>
                        <button className="add-question-btn" onClick={() => deleteQuiz(quiz.title)}>Delete Quiz</button>
                        <button className="add-question-btn" onClick={() => openAiQuestionModal(quiz._id)}>🤖 Add Question (AI)</button>
                        <button className="add-question-btn" onClick={() => openAddQuestionModal(quiz._id)}>➕ Add Question</button>
                        <ul className="display-ans">
                            {quiz.questions.map((q, i) => (
                                <li key={i}>Question: {q.question} <br/> Correct Answer: {q.correctAnswer}</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>

            {/* AI Question Generation Modal */}
            <dialog id="ai_question_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={handleAiSubmit}>
                        <Link to="#" className="close-btn"
                            onClick={() => document.getElementById("ai_question_modal").close()}>
                            ✕
                        </Link>

                        <h3 className="modal-title">AI Question Generation</h3>
                        <input type="text" name="aiTopic" placeholder="Enter Topic" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} required />
                        <input type="number" name="aiNumQuestions" placeholder="Enter Number of Questions" value={aiNumQuestions} onChange={(e) => setAiNumQuestions(e.target.value)} required />
                        <button className="submit-btn">Generate Questions</button>
                    </form>
                </div>
            </dialog>

            {/* Create Quiz Modal */}
            <dialog id="create_quiz_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={createQuiz}>
                        <Link to="#" className="close-btn"
                            onClick={() => document.getElementById("create_quiz_modal").close()}>
                            ✕
                        </Link>

                        <h3 className="modal-title">Create Quiz</h3>
                        <input type="text" name="title" placeholder="Enter Quiz Title" required />
                        <input type="text" name="category" placeholder="Enter Quiz Category" required />
                        <input type="number" name="duration" placeholder="Enter Duration (minutes)" required />
                        <input type="number" name="totalMarks" placeholder="Enter Total Marks" required />
                        <input type="number" name="passingMarks" placeholder="Enter Passing Marks" required />
                        <button className="submit-btn">Create Quiz</button>
                    </form>
                </div>
            </dialog>

            {/* Add Question Modal */}
            <dialog id="add_question_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={addQuestion}>
                        <Link to="#" className="close-btn"
                            onClick={() => document.getElementById("add_question_modal").close()}>
                            ✕
                        </Link>

                        <h3 className="modal-title">Add Question</h3>
                        <input type="text" name="question" placeholder="Enter Question" required />
                        <input type="text" name="optionA" placeholder="Option A" required />
                        <input type="text" name="optionB" placeholder="Option B" required />
                        <input type="text" name="optionC" placeholder="Option C" required />
                        <input type="text" name="optionD" placeholder="Option D" required />
                        <input type="text" name="correctAnswer" placeholder="Correct Answer (A/B/C/D)" required />
                        <button className="submit-btn">Add Question</button>
                    </form>
                </div>
            </dialog>
        </div>
    );
};

export default AdminQuizzes;