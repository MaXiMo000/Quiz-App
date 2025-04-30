import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import "../App.css";
import "./AdminQuizzes.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const getQuiz = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/quizzes`);
            setQuizzes(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getQuiz();
    }, []);

    const openAddQuestionModal = (quizId) => {
        if (!quizId) return alert("Please select a quiz first!");
        setSelectedQuizId(quizId);
        document.getElementById("add_question_modal").showModal();
    };

    const openAiQuestionModal = (quizId, category) => {
        setSelectedQuizId(quizId);
        setAiTopic(category);
        setAiNumQuestions(5);
        document.getElementById("ai_question_modal").showModal();
    };

    const handleAiSubmit = async (event) => {
        event.preventDefault();
        if (!aiTopic || aiNumQuestions <= 0) {
            alert("Please enter a valid topic and number of questions.");
            return;
        }

        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/quizzes/${selectedQuizId}/generate-questions`,
                {
                    topic: aiTopic,
                    numQuestions: Number(aiNumQuestions)
                },
                { headers: { "Content-Type": "application/json" } } 
            );

            if (response.status !== 200) {
                throw new Error(`Error Generating questions: ${response.status}`);
            }

            alert("AI-generated questions added successfully!");
            document.getElementById("ai_question_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error generating AI questions:", error);
            alert("Failed to generate AI questions.");
        }
    };

    const createQuiz = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const quizData = {
            title: formData.get("title"),
            category: formData.get("category"),
        };

        try {
            await axios.post(`${BACKEND_URL}/api/quizzes`, quizData);
            document.getElementById("create_quiz_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error creating quiz:", error);
            alert("Failed to create quiz. Check API response.");
        }
    };

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
            difficulty: formData.get("difficulty"),
        };

        try {
            await axios.post(`${BACKEND_URL}/api/quizzes/${selectedQuizId}/questions`, questionData);
            document.getElementById("add_question_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question. Check API response.");
        }
    };

    const deleteQuiz = async (title) => {
        if (!title) return alert("Quiz title is missing!");

        try {
            const response = await axios.delete(`${BACKEND_URL}/api/quizzes/delete/quiz?title=${encodeURIComponent(title)}`);
            if (response.status === 200) {
                alert("Quiz deleted successfully!");
                getQuiz();
            }
        } catch (error) {
            console.error("Error deleting quiz:", error);
            alert("Failed to delete quiz. Check the API response.");
        }
    };

    if (loading) return <p>Loading ...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="admin-quiz-container main-content">
            <div className="quiz-header">
                <h2>📚 Manage Quizzes</h2>
                <button className="create-btn" onClick={() => document.getElementById("create_quiz_modal").showModal()}>
                    ➕ Create Quiz
                </button>
            </div>

            <div className="quiz-list">
                {quizzes.map((quiz) => (
                    <div key={quiz._id} className="quiz-box">
                        <h3>{quiz.title}</h3>
                        <p>Category: {quiz.category}</p>
                        <p>Duration: {quiz.duration} minutes</p>
                        <p>Total Marks: {quiz.totalMarks}</p>
                        <p>Passing Marks: {quiz.passingMarks}</p>
                        <button className="add-question-btn" onClick={() => deleteQuiz(quiz.title)}>🗑️ Delete Quiz</button>
                        <button className="add-question-btn" onClick={() => openAiQuestionModal(quiz._id, quiz.category)}>🤖 Add Question (AI)</button>
                        <button className="add-question-btn" onClick={() => openAddQuestionModal(quiz._id)}>➕ Add Question</button>
                        <button className="view-questions-btn" onClick={() => navigate(`/admin/quiz/${quiz._id}`)}>📜 View Questions</button>
                        <ul className="display-ans">
                            {quiz.questions.map((q, i) => (
                                <li key={i}>Question: {q.question}<br />Correct Answer: {q.correctAnswer}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* AI Question Generation Modal */}
            <dialog id="ai_question_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={handleAiSubmit}>
                        <Link to="#" className="close-btn" onClick={() => document.getElementById("ai_question_modal").close()}>✕</Link>
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
                        <Link to="#" className="close-btn" onClick={() => document.getElementById("create_quiz_modal").close()}>✕</Link>
                        <h3 className="modal-title">Create Quiz</h3>
                        <input type="text" name="title" placeholder="Enter Quiz Title" required />
                        <input type="text" name="category" placeholder="Enter Quiz Category" required />
                        <button className="submit-btn">Create Quiz</button>
                    </form>
                </div>
            </dialog>

            {/* Add Question Modal */}
            <dialog id="add_question_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={addQuestion} className="question-form">
                        <Link to="#" className="close-btn" onClick={() => document.getElementById("add_question_modal").close()}>✕</Link>
                        <h3 className="modal-title">➕ Add New Question</h3>
                        <input type="text" name="question" placeholder="📝 Enter your question" className="form-input" required />
                        <div className="option-pair">
                            <input type="text" name="optionA" placeholder="Option A" className="form-input" required />
                            <input type="text" name="optionB" placeholder="Option B" className="form-input" required />
                        </div>
                        <div className="option-pair">
                            <input type="text" name="optionC" placeholder="Option C" className="form-input" required />
                            <input type="text" name="optionD" placeholder="Option D" className="form-input" required />
                        </div>
                        <select name="difficulty" defaultValue="medium" className="form-select" required>
                            <option value="easy">🌱 Easy</option>
                            <option value="medium">🌿 Medium</option>
                            <option value="hard">🔥 Hard</option>
                        </select>
                        <input type="text" name="correctAnswer" placeholder="✅ Correct Answer (A/B/C/D)" className="form-input" required />
                        <button className="submit-btn">Add Question</button>
                    </form>
                </div>
            </dialog>
        </div>
    );
};

export default AdminQuizzes;
