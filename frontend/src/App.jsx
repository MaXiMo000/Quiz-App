import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthWrapper from "./components/AuthWrapper";
import Layout from "./components/Layout"; // ✅ Your layout with Sidebar
import "./App.css";

// ✅ Lazy load all pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminQuizzes = lazy(() => import("./pages/AdminQuizzes"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const UserQuizzes = lazy(() => import("./pages/UserQuiz"));
const TakeQuiz = lazy(() => import("./pages/TakeQuiz"));
const UserReports = lazy(() => import("./pages/UserReports"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const UserReportsCheck = lazy(() => import("./pages/UserReportsCheck"));
const QuizQuestions = lazy(() => import("./pages/QuizQuestions"));
const UserWrittenTests = lazy(() => import("./pages/UserWrittenTests"));
const TakeWrittenTest = lazy(() => import("./pages/TakeWrittenTest"));
const AdminWrittenTests = lazy(() => import("./pages/AdminWrittenTests"));
const TestQuestions = lazy(() => import("./pages/TestQuestions"));
const AdminWrittenTestReports = lazy(() => import("./pages/AdminWrittenTestReports"));
const UserWrittenReports = lazy(() => import("./pages/UserWrittenReports"));
const UserWrittenReportCheck = lazy(() => import("./pages/UserWrittenReportsCheck"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

const App = () => {
    return (
        <Router>
            <Suspense fallback={<div className="loading">Loading...</div>}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route element={<AuthWrapper><Layout /></AuthWrapper>}>
                        <Route path="/" element={<Home />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/create" element={<AdminQuizzes />} />
                        <Route path="/admin/report" element={<AdminReports />} />
                        <Route path="/admin/quiz/:id" element={<QuizQuestions />} />
                        <Route path="/admin/written-tests" element={<AdminWrittenTests />} />
                        <Route path="/admin/written-test/question/:id" element={<TestQuestions />} />
                        <Route path="/admin/written-test/report" element={<AdminWrittenTestReports />} />
                        <Route path="/user/test" element={<UserQuizzes />} />
                        <Route path="/user/test/:id" element={<TakeQuiz />} />
                        <Route path="/user/report" element={<UserReports />} />
                        <Route path="/report/:id" element={<UserReportsCheck />} />
                        <Route path="/written-tests" element={<UserWrittenTests />} />
                        <Route path="/take-written-test/:id" element={<TakeWrittenTest />} />
                        <Route path="/user/written-reports" element={<UserWrittenReports />} />
                        <Route path="/user/written-test-report/:id" element={<UserWrittenReportCheck />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                    </Route>
                </Routes>
            </Suspense>
        </Router>
    );
};

export default App;
