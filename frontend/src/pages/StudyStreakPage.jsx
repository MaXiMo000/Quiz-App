import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StudyStreakGoals from '../components/StudyStreakGoals';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './StudyStreakPage.css';

const StudyStreakPage = () => {
    const navigate = useNavigate();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            navigate('/');
        },
    }, [navigate]);

    return (
        <div className="study-streak-page" role="main" aria-label="Study Streak and Daily Goals">
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1>🔥 Study Streak & Daily Goals</h1>
                <p>Track your daily progress, maintain your streak, and achieve your learning goals!</p>
            </motion.div>

            <StudyStreakGoals />
        </div>
    );
};

export default StudyStreakPage;
