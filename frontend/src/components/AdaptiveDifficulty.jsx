import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import './AdaptiveDifficulty.css';

const AdaptiveDifficulty = ({ user, onDifficultyChange }) => {
    const [adaptiveData, setAdaptiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('general');

    const categories = [
        'general', 'mathematics', 'science', 'history', 
        'literature', 'geography', 'programming', 'sports'
    ];

    useEffect(() => {
        const fetchAdaptiveDifficulty = async () => {
            if (!user?._id) return;
            
            try {
                setLoading(true);
                const response = await axios.get(`/api/intelligence/adaptive-difficulty?category=${selectedCategory}`)
                setAdaptiveData(response.data);
                
                // Notify parent component about recommended difficulty
                if (onDifficultyChange) {
                    onDifficultyChange(response.data.recommendedDifficulty);
                }
            } catch (err) {
                console.error('Error fetching adaptive difficulty:', err);
                console.error('Error details:', err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAdaptiveDifficulty();
    }, [user, selectedCategory, onDifficultyChange]);

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return '#4CAF50';
            case 'medium': return '#FF9800';
            case 'hard': return '#f44336';
            default: return '#2196F3';
        }
    };

    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '🔵';
        }
    };

    if (loading) {
        return (
            <div className="adaptive-difficulty loading">
                <div className="loading-spinner"></div>
                <p>Analyzing your performance...</p>
            </div>
        );
    }

    if (!adaptiveData) {
        return (
            <div className="adaptive-difficulty empty">
                <h4>🎯 Smart Difficulty</h4>
                <p>Take more quizzes to get personalized difficulty recommendations!</p>
            </div>
        );
    }

    return (
        <div className="adaptive-difficulty">
            
            <div className="difficulty-header">
                <h4>🎯 Smart Difficulty Recommendation</h4>
                <p>Based on your recent performance</p>
            </div>

            <div className="category-selector">
                <label htmlFor="category-select">Select Category:</label>
                <select 
                    id="category-select"
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="category-dropdown"
                >
                    {categories.map(category => (
                        <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <motion.div 
                className="difficulty-recommendation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="recommendation-card">
                    <div className="difficulty-icon">
                        {getDifficultyIcon(adaptiveData.recommendedDifficulty)}
                    </div>
                    <div className="difficulty-info">
                        <h3 
                            style={{ color: getDifficultyColor(adaptiveData.recommendedDifficulty) }}
                        >
                            {adaptiveData.recommendedDifficulty.toUpperCase()}
                        </h3>
                        <p>Recommended difficulty level</p>
                    </div>
                </div>

                <div className="confidence-section">
                    <div className="confidence-bar">
                        <div 
                            className="confidence-fill"
                            style={{ 
                                width: `${adaptiveData.confidence * 100}%`,
                                backgroundColor: getDifficultyColor(adaptiveData.recommendedDifficulty)
                            }}
                        ></div>
                    </div>
                    <span className="confidence-text">
                        {Math.round(adaptiveData.confidence * 100)}% confidence
                    </span>
                </div>

                <div className="analysis-details">
                    <div className="detail-item">
                        <span className="detail-label">Based on:</span>
                        <span className="detail-value">
                            {adaptiveData.basedOnQuizzes} quiz{adaptiveData.basedOnQuizzes !== 1 ? 'es' : ''}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Category:</span>
                        <span className="detail-value">{adaptiveData.category}</span>
                    </div>
                </div>
            </motion.div>

            <div className="difficulty-explanation">
                <h5>💡 Why this difficulty?</h5>
                <p>
                    {adaptiveData.recommendedDifficulty === 'easy' && 
                        "Based on your recent performance, we recommend starting with easier questions to build confidence and solidify your foundation."}
                    {adaptiveData.recommendedDifficulty === 'medium' && 
                        "Your performance shows you're ready for medium difficulty questions that will challenge you appropriately while maintaining good learning progress."}
                    {adaptiveData.recommendedDifficulty === 'hard' && 
                        "Excellent work! Your strong performance indicates you're ready for challenging questions that will push your limits and accelerate learning."}
                </p>
            </div>
        </div>
    );
};

export default AdaptiveDifficulty;
