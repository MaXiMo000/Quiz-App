import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthWrapper from "./components/AuthWrapper";
import Layout from "./components/Layout"; // ✅ Your layout with Sidebar
import "./App.css";
import Spinner from "./components/Spinner";
import GoogleAuth from "./components/GoogleAuth";
import OfflineBanner from "./components/OfflineBanner"; // ✅ Offline status banner
import pwaManager from './utils/pwaUtils'; // ✅ PWA management utilities
import { useNetworkStatus } from './hooks/useNetworkStatus'; // ✅ Network status detection

// ✅ PWA Debug utilities (development only)
if (import.meta.env.DEV) {
  import('./utils/pwaDebug.js');
}

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import RefundPolicy from './pages/RefundPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import ContactUs from './pages/ContactUs';
import PWAInstallTest from './components/PWAInstallTest';
import { ThemeProvider } from "./context/ThemeContext";

// ✅ Lazy load all pages
const AdaptiveQuiz = lazy(() => import("./components/AdaptiveQuiz"));
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
import PremiumQuizzes from "./pages/PremiumQuizzes";
import PremiumQuizQuestions from "./pages/PremiumQuizQuestions";
import Contact from "./pages/Contact";
import UserAnalyticsDashboard from "./pages/UserAnalyticsDashboard";
import XPLeaderboard from "./pages/XPLeaderboard";
import ThemePage from "./pages/ThemePage";

// ✨ Import new enhanced components
import EnhancedDashboard from "./components/EnhancedDashboard";
import AchievementSystem from "./components/AchievementSystem";

// Phase 3: Social & Gamification Components
import FriendsSystem from "./components/FriendsSystem";
import StudyGroups from "./components/StudyGroups";

// Phase 4: Next-Gen Features
import AIStudyBuddy from "./components/AIStudyBuddy";
import RealTimeQuiz from "./components/RealTimeQuiz";
import GamificationHub from "./components/GamificationHub";

// Phase 5: Advanced Learning Path Engine
import LearningPathHub from "./components/LearningPathHub";

const TestPage = lazy(() => import("./pages/TestPage"));

// Phase 2: Intelligence Dashboard
const IntelligenceDashboard = lazy(() => import("./pages/IntelligenceDashboard"));

const App = () => {
    const isOnline = useNetworkStatus(); // ✅ Monitor network status
    
    // 🔒 SECURITY: Removed unnecessary user state and logging
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            // User data is available in localStorage when needed
        }
    }, []);

    // ✅ PWA initialization and management
    useEffect(() => {
        // Initialize PWA manager
        console.log('🚀 PWA Manager initialized');
        
        // Make PWA manager globally accessible for debugging
        window.pwaManager = pwaManager;
        
        // Add enhanced PWA debug utilities
        window.pwaDebug = {
            checkStatus: () => pwaManager.getInstallationInfo(),
            checkCriteria: () => pwaManager.checkInstallability(),
            forceInstallCheck: () => {
                console.log('🔍 Forcing PWA installability check...');
                window.dispatchEvent(new CustomEvent('pwa-check-installability'));
                return pwaManager.checkInstallability();
            },
            simulateInstallPrompt: () => {
                console.log('🎯 Simulating install prompt for testing...');
                if (pwaManager.installPrompt) {
                    return pwaManager.promptInstall();
                } else {
                    console.log('⚠️ No install prompt available - showing browser-specific instructions');
                    pwaManager.showBrowserSpecificInstructions();
                    return false;
                }
            },
            getManifest: async () => {
                try {
                    const manifestLink = document.querySelector('link[rel="manifest"]');
                    if (manifestLink) {
                        const response = await fetch(manifestLink.href);
                        return await response.json();
                    }
                    return null;
                } catch (error) {
                    console.error('Failed to fetch manifest:', error);
                    return null;
                }
            },
            clearPWAData: () => {
                localStorage.removeItem('pwa_installed_at');
                localStorage.removeItem('pwa_install_source');
                console.log('🗑️ PWA data cleared');
            },
            testInstallFlow: () => {
                console.log('🧪 Testing PWA install flow...');
                const status = pwaManager.getInstallationInfo();
                console.log('Current status:', status);
                
                if (status.canInstall) {
                    console.log('✅ Can install - showing prompt');
                    return pwaManager.promptInstall();
                } else {
                    console.log('❌ Cannot install - showing browser-specific instructions');
                    pwaManager.showBrowserSpecificInstructions();
                    return false;
                }
            }
        };
        
        console.log('🔧 PWA Debug utilities loaded. Use window.pwaDebug.checkStatus() to check PWA status');
        
        // Check for updates periodically when online
        if (isOnline) {
            pwaManager.checkForUpdates();
        }
        
        // Log PWA installation status
        const pwaInfo = pwaManager.getInstallationInfo();
        console.log('📱 PWA Initial Status:', pwaInfo);
        
        // Force check for beforeinstallprompt event with multiple attempts
        setTimeout(() => {
            const newPwaInfo = pwaManager.getInstallationInfo();
            console.log('📱 PWA Status after delay:', newPwaInfo);
            
            // If still not installable, force a check
            if (!newPwaInfo.isInstallable && !newPwaInfo.isInstalled) {
                console.log('🔍 PWA not installable after delay, forcing check...');
                pwaManager.checkInstallability();
                
                // Try again after another delay
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('pwa-check-installability'));
                }, 2000);
            }
        }, 2000);
    }, [isOnline]);

    return (
        <ThemeProvider>
            <Router>
                <OfflineBanner /> {/* ✅ Global offline status banner */}
                <Suspense fallback={<Spinner />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/google-auth" element={<GoogleAuth />} />
                        <Route path="/pwa-test" element={<PWAInstallTest />} />

                        {/* Protected Routes */}
                        <Route element={<AuthWrapper><Layout /></AuthWrapper>}>
                            <Route path="/" element={<Home />} />
                            <Route path="/test-features" element={<TestPage />} />
                            <Route path="/enhanced-dashboard" element={<EnhancedDashboard />} />
                            <Route path="/achievements" element={<AchievementSystem />} />
                            <Route path="/themes" element={<ThemePage />} />
                            
                            {/* Phase 3: Social & Gamification Routes */}
                            <Route path="/friends" element={<FriendsSystem />} />
                            <Route path="/study-groups" element={<StudyGroups />} />
                            <Route path="/gamification" element={<GamificationHub />} />
                            
                            {/* Phase 4: Next-Gen Features */}
                            <Route path="/ai-study-buddy" element={<AIStudyBuddy />} />
                            <Route path="/real-time-quiz" element={<RealTimeQuiz />} />
                            
                            {/* Phase 5: Advanced Learning Path Engine */}
                            <Route path="/learning-paths" element={<LearningPathHub />} />
                            
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/create" element={<AdminQuizzes />} />
                            <Route path="/adaptive/:id" element={<AdaptiveQuiz />} />
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
                            <Route path="/xp-leaderboard" element={<XPLeaderboard />} />
                            
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                            <Route path="/refund-policy" element={<RefundPolicy />} />
                            <Route path="/shipping-policy" element={<ShippingPolicy />} />
                            <Route path="/contactUs" element={<ContactUs />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/analytics" element={<UserAnalyticsDashboard />} />

                            {/* Phase 2: Intelligence Dashboard - Premium Feature */}
                            <Route path="/intelligence-dashboard" element={<IntelligenceDashboard />} />

                            <Route path="/premium/quizzes" element={<PremiumQuizzes />} />
                            <Route path="/premium/quiz/:id" element={<PremiumQuizQuestions />} />
                        </Route>
                    </Routes>
                </Suspense>
            </Router>
        </ThemeProvider>
    );
};

export default App;
