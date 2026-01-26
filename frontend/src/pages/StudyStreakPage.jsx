import React from 'react';
import { motion } from 'framer-motion';
import StudyStreakGoals from '../components/StudyStreakGoals';
import './StudyStreakPage.css';

const StudyStreakPage = () => {
    return (
        <div className="study-streak-page">
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
