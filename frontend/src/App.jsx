import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";  // Sidebar navigation
import AdminDashboard from "./pages/AdminDashboard";
import AdminQuizzes from "./pages/AdminQuizzes";
import AdminReports from "./pages/AdminReports";
import UserQuizzes from "./pages/UserQuiz";
import TakeQuiz from "./pages/TakeQuiz";
import UserReports from "./pages/UserReports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import UserReportsCheck from "./pages/UserReportsCheck";
import QuizQuestions from "./pages/QuizQuestions";
import UserWrittenTests from "./pages/UserWrittenTests";
import TakeWrittenTest from "./pages/TakeWrittenTest";
import AdminWrittenTests from "./pages/AdminWrittenTests";
import TestQuestions from "./pages/TestQuestions";
import AdminWrittenTestReports from "./pages/AdminWrittenTestReports";
import UserWrittenReports from "./pages/UserWrittenReports";
import UserWrittenReportCheck from "./pages/UserWrittenReportsCheck";
import "./App.css"; // Import global styles

const App = () => {
    return (
        <Router>
            <Sidebar /> {/* Sidebar always visible */}
            <div className="main-content"> {/* Ensures proper spacing */}
                <Routes>
                    {/* 🔹 Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* 🔹 Admin Routes */}
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/create" element={<AdminQuizzes />} />
                    <Route path="/admin/report" element={<AdminReports />} />

                    <Route path="/admin/quiz/:id" element={<QuizQuestions />} />
                    <Route path="/admin/written-tests" element={<AdminWrittenTests />} />
                    <Route path="/admin/written-test/question/:id" element={<TestQuestions />} />

                    <Route path="/admin/written-test/report" element={<AdminWrittenTestReports />} />
                    
                    {/* 🔹 User Routes */}
                    <Route path="/user/test" element={<UserQuizzes />} />
                    <Route path="/user/test/:id" element={<TakeQuiz />} />
                    <Route path="/user/report" element={<UserReports />} />

                    <Route path="/report/:id" element={<UserReportsCheck />} />

                    <Route path="/written-tests" element={<UserWrittenTests />} />
                    <Route path="/take-written-test/:id" element={<TakeWrittenTest />} />

                    <Route path="/user/written-reports" element={<UserWrittenReports />} />
                    <Route path="/user/written-test-report/:id" element={<UserWrittenReportCheck />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
