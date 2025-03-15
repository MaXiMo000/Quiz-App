import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import AuthWrapper from "./components/AuthWrapper"; // ✅ Import AuthWrapper

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
import Leaderboard from "./pages/Leaderboard";
import "./App.css";

const App = () => {
    return (
        <Router>
            <Routes>
                {/* 🔹 Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* ✅ Private Routes: Wrapped with `AuthWrapper` */}
                <Route 
                    path="/*"
                    element={
                        <AuthWrapper>
                            <Sidebar /> {/* Sidebar appears only for logged-in users */}
                            <div className="main-content">
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/admin" element={<AdminDashboard />} />
                                    <Route path="/admin/create" element={<AdminQuizzes />} />
                                    <Route path="/admin/report" element={<AdminReports />} />
                                    <Route path="/admin/quiz/:id" element={<QuizQuestions />} />
                                    <Route path="/admin/written-tests" element={<AdminWrittenTests />} />
                                    <Route path="/admin/written-test/question/:id" element={<TestQuestions />} />
                                    <Route path="/admin/written-test/report" element={<AdminWrittenTestReports />} />
                                    
                                    {/* User Routes */}
                                    <Route path="/user/test" element={<UserQuizzes />} />
                                    <Route path="/user/test/:id" element={<TakeQuiz />} />
                                    <Route path="/user/report" element={<UserReports />} />
                                    <Route path="/report/:id" element={<UserReportsCheck />} />
                                    <Route path="/written-tests" element={<UserWrittenTests />} />
                                    <Route path="/take-written-test/:id" element={<TakeWrittenTest />} />
                                    <Route path="/user/written-reports" element={<UserWrittenReports />} />
                                    <Route path="/user/written-test-report/:id" element={<UserWrittenReportCheck />} />
                                    <Route path="/leaderboard" element={<Leaderboard />} />
                                </Routes>
                            </div>
                        </AuthWrapper>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;