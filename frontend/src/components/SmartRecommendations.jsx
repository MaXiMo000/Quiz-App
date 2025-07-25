import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import './SmartRecommendations.css';

const SmartRecommendations = ({ user }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!user?._id) return;
            
            try {
                setLoading(true);
                const response = await axios.get('/api/intelligence/recommendations');
                setRecommendations(response.data.recommendations || []);
                setUserProfile(response.data.userProfile || null);
            } catch (err) {
                console.error('Error fetching recommendations:', err);
                setError('Failed to load recommendations');
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [user]);

    const getReasonIcon = (reason) => {
        switch (reason) {
            case 'based_on_favorite_category':
                return '⭐';
            case 'difficulty_match':
                return '🎯';
            case 'weakness_improvement':
                return '💪';
            case 'popular_choice':
                return '🔥';
            default:
                return '📚';
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return '#4CAF50'; // Green
        if (confidence >= 0.6) return '#FF9800'; // Orange
        return '#2196F3'; // Blue
    };

    const handleQuizSelect = (quiz) => {
        // Navigate to quiz taking page
        window.location.href = `/take-quiz/${quiz._id}`;
    };

    if (loading) {
        return (
            <div className="smart-recommendations loading">
                <div className="loading-spinner"></div>
                <p>Finding perfect quizzes for you...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="smart-recommendations error">
                <p>❌ {error}</p>
            </div>
        );
    }

    if (recommendations.length === 0) {
        console.log('No recommendations found. Current state:', { recommendations, loading, error });
        return (
            <div className="smart-recommendations empty">
                <h3>🎯 Smart Recommendations</h3>
                <p>Take a few more quizzes to get personalized recommendations!</p>
                <p style={{fontSize: '0.8rem', color: '#666', marginTop: '1rem'}}>
                    Debug: Recommendations array length = {recommendations.length}
                </p>
            </div>
        );
    }

    return (
        <div className="smart-recommendations">
            
            <div className="recommendations-header">
                <h3>🎯 Smart Recommendations</h3>
                {userProfile && (
                    <div className="user-insights">
                        <span className="insight-item">
                            Level {userProfile.level} • {userProfile.xp} XP
                        </span>
                        {userProfile.preferences?.preferredDifficulty && (
                            <span className="insight-item">
                                Prefers {userProfile.preferences.preferredDifficulty} difficulty
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="recommendations-grid">
                {recommendations.map((rec, index) => (
                    <motion.div
                        key={rec.quiz._id}
                        className="recommendation-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleQuizSelect(rec.quiz)}
                    >
                        <div className="recommendation-header">
                            <div className="quiz-title">
                                <h4>{rec.quiz.title}</h4>
                                <span className="quiz-category">{rec.quiz.category}</span>
                            </div>
                            <div 
                                className="reason-icon"
                                title={rec.reason.replace(/_/g, ' ')}
                            >
                                {getReasonIcon(rec.reason)}
                            </div>
                        </div>

                        <p className="recommendation-description">
                            {rec.description}
                        </p>

                        <div className="quiz-stats">
                            <div className="stat-item">
                                <span className="stat-label">Questions:</span>
                                <span className="stat-value">{rec.quiz.questions?.length || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Duration:</span>
                                <span className="stat-value">{rec.quiz.duration || 'N/A'} min</span>
                            </div>
                            {rec.quiz.averageScore > 0 && (
                                <div className="stat-item">
                                    <span className="stat-label">Avg Score:</span>
                                    <span className="stat-value">
                                        {Math.round(rec.quiz.averageScore * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="recommendation-footer">
                            <div 
                                className="confidence-badge"
                                style={{ backgroundColor: getConfidenceColor(rec.confidence) }}
                            >
                                {Math.round(rec.confidence * 100)}% match
                            </div>
                            <button className="take-quiz-btn">
                                Take Quiz →
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {userProfile && (userProfile.weakAreas?.length > 0 || userProfile.strongAreas?.length > 0) && (
                <div className="user-areas">
                    <div className="areas-section">
                        {userProfile.strongAreas?.length > 0 && (
                            <div className="strong-areas">
                                <h4>💪 Your Strengths</h4>
                                <div className="areas-tags">
                                    {userProfile.strongAreas.map((area, index) => (
                                        <span key={index} className="area-tag strong">
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {userProfile.weakAreas?.length > 0 && (
                            <div className="weak-areas">
                                <h4>📚 Areas to Improve</h4>
                                <div className="areas-tags">
                                    {userProfile.weakAreas.map((area, index) => (
                                        <span key={index} className="area-tag weak">
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartRecommendations;
