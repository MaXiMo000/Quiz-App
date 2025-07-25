import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import './LearningAnalytics.css';

const LearningAnalytics = ({ user }) => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user?._id) return;
            
            try {
                setLoading(true);
                const response = await axios.get('/api/intelligence/analytics');
                setAnalyticsData(response.data);
            } catch (err) {
                console.error('Error fetching analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [user]);

    const tabs = [
        { id: 'overview', label: '📊 Overview', icon: '📊' },
        { id: 'trends', label: '📈 Trends', icon: '📈' },
        { id: 'predictions', label: '🔮 Predictions', icon: '🔮' },
        { id: 'recommendations', label: '💡 Study Tips', icon: '💡' }
    ];

    if (loading) {
        return (
            <div className="learning-analytics loading">
                <div className="loading-spinner"></div>
                <p>Analyzing your learning patterns...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="learning-analytics error">
                <p>❌ {error}</p>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="learning-analytics empty">
                <h3>📊 Learning Analytics</h3>
                <p>Take more quizzes to see detailed analytics!</p>
            </div>
        );
    }

    const renderOverview = () => {
        const { overview } = analyticsData;
        if (!overview) return <p>No overview data available.</p>;

        return (
            <div className="overview-section">
                <div className="stats-grid">
                    <motion.div 
                        className="stat-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="stat-icon">📚</div>
                        <div className="stat-content">
                            <h4>{overview.totalQuizzes}</h4>
                            <p>Total Quizzes</p>
                        </div>
                    </motion.div>

                    <motion.div 
                        className="stat-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="stat-icon">❓</div>
                        <div className="stat-content">
                            <h4>{overview.totalQuestions}</h4>
                            <p>Questions Answered</p>
                        </div>
                    </motion.div>

                    <motion.div 
                        className="stat-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="stat-icon">🎯</div>
                        <div className="stat-content">
                            <h4>{overview.averageScore}%</h4>
                            <p>Average Score</p>
                        </div>
                    </motion.div>

                    <motion.div 
                        className="stat-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="stat-icon">
                            {overview.improvementRate > 0 ? '📈' : overview.improvementRate < 0 ? '📉' : '➖'}
                        </div>
                        <div className="stat-content">
                            <h4>{overview.improvementRate > 0 ? '+' : ''}{overview.improvementRate}%</h4>
                            <p>Improvement Rate</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    };

    const renderTrends = () => {
        const { trends } = analyticsData;
        if (!trends || trends.length === 0) return <p>Not enough data for trends analysis.</p>;

        return (
            <div className="trends-section">
                <h4>📈 Weekly Performance Trends</h4>
                <div className="trends-chart">
                    {trends.map((trend, index) => {
                        const hasData = trend.quizzesTaken > 0;
                        const barHeight = hasData ? Math.max(trend.averageScore, 10) : 8;
                        
                        return (
                            <motion.div 
                                key={index}
                                className={`trend-bar ${!hasData ? 'no-data' : ''}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${barHeight}%` }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                style={{
                                    backgroundColor: hasData ? undefined : '#e0e0e0',
                                    minHeight: '20px'
                                }}
                            >
                                <div className="trend-info">
                                    <span className="trend-score">
                                        {hasData ? `${trend.averageScore}%` : 'No data'}
                                    </span>
                                    <span className="trend-label">
                                        {trend.label || `Week ${trend.week + 1}`}
                                    </span>
                                    <span className="trend-count">
                                        {hasData ? `${trend.quizzesTaken} quiz${trend.quizzesTaken !== 1 ? 'es' : ''}` : '0 quizzes'}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                <div className="trends-note">
                    <p>📊 Chart shows your performance over the last 4 weeks</p>
                </div>
            </div>
        );
    };

    const renderPredictions = () => {
        const { predictions } = analyticsData;
        if (!predictions) return <p>Not enough data for predictions.</p>;

        return (
            <div className="predictions-section">
                <motion.div 
                    className="prediction-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="prediction-header">
                        <h4>🔮 Next Quiz Prediction</h4>
                        <span className={`confidence-badge ${predictions.confidenceLevel}`}>
                            {predictions.confidenceLevel} confidence
                        </span>
                    </div>
                    
                    {predictions.nextQuizPrediction !== null ? (
                        <>
                            <div className="prediction-score">
                                <span className="predicted-score">{predictions.nextQuizPrediction}%</span>
                                <span className="prediction-label">Expected Score</span>
                            </div>
                            
                            <div className="trend-indicator">
                                <span className={`trend-badge ${predictions.trend}`}>
                                    {predictions.trend === 'improving' && '📈 Improving'}
                                    {predictions.trend === 'declining' && '📉 Declining'} 
                                    {predictions.trend === 'stable' && '➖ Stable'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <p>Take more quizzes to see predictions!</p>
                    )}
                </motion.div>
            </div>
        );
    };

    const renderRecommendations = () => {
        const { studyRecommendations, optimalStudyTime, strengths, weaknesses } = analyticsData;

        return (
            <div className="recommendations-section">
                {optimalStudyTime && (
                    <motion.div 
                        className="recommendation-card optimal-time"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h4>🕐 Your Best Study Time</h4>
                        <p>You perform best at <strong>{optimalStudyTime.hour}:00</strong></p>
                        <span className="performance-score">
                            {Math.round(optimalStudyTime.average * 100)}% average score
                        </span>
                    </motion.div>
                )}

                {studyRecommendations && studyRecommendations.length > 0 && (
                    <div className="study-tips">
                        <h4>💡 Personalized Study Tips</h4>
                        {studyRecommendations.map((rec, index) => (
                            <motion.div 
                                key={index}
                                className="tip-card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <h5>{rec.title}</h5>
                                <p>{rec.description}</p>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="strengths-weaknesses">
                    {strengths && strengths.length > 0 && (
                        <div className="strengths-section">
                            <h4>💪 Your Strengths</h4>
                            {strengths.map((strength, index) => (
                                <div key={index} className="strength-item">
                                    <span className="category-name">{strength.category}</span>
                                    <span className="category-score">{strength.averageScore}%</span>
                                    <div className="category-bar">
                                        <div 
                                            className="category-fill strength"
                                            style={{ width: `${strength.averageScore}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {weaknesses && weaknesses.length > 0 && (
                        <div className="weaknesses-section">
                            <h4>📚 Areas to Improve</h4>
                            {weaknesses.map((weakness, index) => (
                                <div key={index} className="weakness-item">
                                    <span className="category-name">{weakness.category}</span>
                                    <span className="category-score">{weakness.averageScore}%</span>
                                    <span className="improvement-needed">+{weakness.improvementNeeded}% needed</span>
                                    <div className="category-bar">
                                        <div 
                                            className="category-fill weakness"
                                            style={{ width: `${weakness.averageScore}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'trends':
                return renderTrends();
            case 'predictions':
                return renderPredictions();
            case 'recommendations':
                return renderRecommendations();
            default:
                return renderOverview();
        }
    };

    return (
        <div className="learning-analytics">
            <div className="analytics-header">
                <h3>📊 Learning Analytics</h3>
                <p>Insights into your learning patterns and performance</p>
            </div>

            <div className="analytics-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="analytics-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default LearningAnalytics;
