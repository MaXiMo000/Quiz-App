import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import "../App.css";
import "./AdminQuizzes.css"; // ✅ Use the same styles as AdminQuizzes

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminWrittenTests = () => {
    const [tests, setTests] = useState([]); // ✅ Store written tests
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [selectedTestId, setSelectedTestId] = useState(null); // ✅ Track selected test
    const [newQuestion, setNewQuestion] = useState(""); // ✅ Store new question
    const [newMarks, setNewMarks] = useState(10); // ✅ Store new marks
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ✅ Fetch written tests from backend
    const fetchTests = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/written-tests`);
            setTests(response.data);
        } catch (error) {
            console.error("Error fetching written tests:", error);
            setError("Error fetching Tests. Try again later.");
        }
        finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    // ✅ Create a new written test
    const createTest = async (event) => {
        event.preventDefault();

        try {
            await axios.post(`${BACKEND_URL}/api/written-tests/create`, { title, category, questions: [] });
            // alert("Written test created successfully!");
            fetchTests();
            document.getElementById("create_test_modal").close();
        } catch (error) {
            console.error("Error creating written test:", error);
            alert("Failed to create written test.");
        }
    };

    // ✅ Open the Add Question Modal
    const openAddQuestionModal = (testId) => {
        setSelectedTestId(testId);
        document.getElementById("add_question_modal").showModal();
    };

    // ✅ Add a question to an existing test
    const addQuestion = async (event) => {
        event.preventDefault();
        if (!selectedTestId) return alert("No test selected!");

        try {
            await axios.post(`${BACKEND_URL}/api/written-tests/${selectedTestId}/add-question`, {
                question: newQuestion,
                marks: newMarks
            });
            // alert("Question added successfully!");
            fetchTests();
            document.getElementById("add_question_modal").close();
        } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question.");
        }
    };

    const deleteQuiz = async (title) => {
        if (!title) {
            alert("Quiz title is missing!");
            return;
        }
    
        try {
            const response = await axios.delete(`${BACKEND_URL}/api/written-tests/delete/Test?title=${encodeURIComponent(title)}`);
    
            if (response.status === 200) {
                alert("Quiz deleted successfully!");
                fetchTests();
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
                <h2>✍️ Manage Written Tests</h2>
                <button className="create-btn" onClick={() => document.getElementById("create_test_modal").showModal()}>
                    ➕ Create Written Test
                </button>
            </div>

            {/* ✅ List of Written Tests */}
            <div className="quiz-list">
                {tests.map((test) => (
                    <div key={test._id} className="quiz-box">
                        <h3>{test.title}</h3>
                        <p>Category: {test.category}</p>
                        <p>Total Questions: {test.questions.length}</p>
                        <button className="add-question-btn" onClick={() => deleteQuiz(test.title)}>Delete Quiz</button>
                        <button className="add-question-btn" onClick={() => openAddQuestionModal(test._id)}>
                            ➕ Add Question
                        </button>
                        <button className="view-questions-btn" onClick={() => navigate(`/admin/written-test/question/${test._id}`)}>📜 View Questions</button>
                        <ul className="display-ans">
                            {test.questions.map((q, i) => (
                                <li key={i}>
                                    {q.question} <br />
                                    <b>Marks:</b> {q.marks}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* ✅ Create Test Modal */}
            <dialog id="create_test_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={createTest}>
                        <Link to="#" className="close-btn" onClick={() => document.getElementById("create_test_modal").close()}>
                            ✕
                        </Link>
                        <h3 className="modal-title">Create Written Test</h3>
                        <input type="text" name="title" placeholder="Enter Test Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <input type="text" name="category" placeholder="Enter Test Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
                        <button className="submit-btn">Create Test</button>
                    </form>
                </div>
            </dialog>

            {/* ✅ Add Question Modal */}
            <dialog id="add_question_modal" className="modal">
                <div className="modal-box">
                    <form onSubmit={addQuestion}>
                        <Link to="#" className="close-btn" onClick={() => document.getElementById("add_question_modal").close()}>
                            ✕
                        </Link>
                        <h3 className="modal-title">Add Question</h3>
                        <textarea name="question" placeholder="Enter Question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} required />
                        <input type="number" name="marks" placeholder="Marks" value={newMarks} onChange={(e) => setNewMarks(e.target.value)} required />
                        <button className="submit-btn">Add Question</button>
                    </form>
                </div>
            </dialog>
        </div>
    );
};

export default AdminWrittenTests;