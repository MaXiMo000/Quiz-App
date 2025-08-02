import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import './LearningPathHub.css';

const LearningPathHub = () => {
    const [activeTab, setActiveTab] = useState('explore');
    const [learningPaths, setLearningPaths] = useState([]);
    const [myPaths, setMyPaths] = useState([]);
    const [currentPath, setCurrentPath] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [competencies, setCompetencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: '',
        level: '',
        search: ''
    });

    // Skill tree visualization
    const [skillTreeData, setSkillTreeData] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const svgRef = useRef(null);

    useEffect(() => {
        loadInitialData();
    }, []); // Safe to remove dependency as this is initialization function

    useEffect(() => {
        if (activeTab === 'explore') {
            loadLearningPaths();
        } else if (activeTab === 'my-paths') {
            loadMyPaths();
        } else if (activeTab === 'analytics') {
            loadAnalytics();
        } else if (activeTab === 'competencies') {
            loadCompetencies();
        }
    }, [activeTab, filters]); // Dependencies are stable - activeTab and filters are state variables

    const loadInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadLearningPaths(),
                loadMyPaths()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLearningPaths = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.level) params.append('level', filters.level);
            if (filters.search) params.append('search', filters.search);

            const response = await axios.get(`/api/learning-paths?${params}`);
            setLearningPaths(response.data.paths);
        } catch (error) {
            console.error('Error loading learning paths:', error);
        }
    };

    const loadMyPaths = async () => {
        try {
            const response = await axios.get('/api/learning-paths');
            setMyPaths(response.data.paths.filter(path => path.userProgress));
        } catch (error) {
            console.error('Error loading my paths:', error);
        }
    };

    const loadAnalytics = async () => {
        try {
            const response = await axios.get('/api/learning-paths/analytics/overview');
            setAnalytics(response.data.analytics);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    const loadCompetencies = async () => {
        try {
            const response = await axios.get('/api/learning-paths/competencies/user');
            setCompetencies(response.data.competencies);
        } catch (error) {
            console.error('Error loading competencies:', error);
        }
    };

    const startLearningPath = async (pathId) => {
        try {
            await axios.post(`/api/learning-paths/${pathId}/start`);
            // Reload data to reflect changes
            loadMyPaths();
            loadLearningPaths();
        } catch (error) {
            console.error('Error starting learning path:', error);
        }
    };

    const openPathViewer = async (pathId) => {
        try {
            const response = await axios.get(`/api/learning-paths/${pathId}`);
            setCurrentPath(response.data);
            setSkillTreeData(generateSkillTreeData(response.data.path, response.data.userProgress));
        } catch (error) {
            console.error('Error loading path details:', error);
        }
    };

    const generateSkillTreeData = (path, userProgress) => {
        const nodes = path.nodes.map(node => {
            const progress = userProgress?.nodeProgress.find(p => p.nodeId === node.id);
            return {
                id: node.id,
                title: node.title,
                description: node.description,
                position: node.position,
                status: progress?.status || 'locked',
                mastery: progress?.mastery || 0,
                prerequisites: node.prerequisites,
                type: node.type,
                estimatedTime: node.estimatedTime
            };
        });

        const links = [];
        nodes.forEach(node => {
            node.prerequisites.forEach(prereqId => {
                links.push({
                    source: prereqId,
                    target: node.id
                });
            });
        });

        return { nodes, links };
    };

    const updateNodeProgress = async (pathId, nodeId, status, score = null, timeSpent = 0) => {
        try {
            await axios.patch(`/api/learning-paths/${pathId}/nodes/${nodeId}`, {
                status,
                score,
                timeSpent
            });
            
            // Reload current path to reflect changes
            if (currentPath && currentPath.path._id === pathId) {
                openPathViewer(pathId);
            }
            
            // Reload my paths
            loadMyPaths();
        } catch (error) {
            console.error('Error updating node progress:', error);
        }
    };

    const renderExploreTab = () => (
        <motion.div
            className="learning-paths-explore"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="explore-header">
                <h2>🗺️ Explore Learning Paths</h2>
                <p>Discover structured learning journeys designed to master new skills</p>
                
                <div className="path-filters">
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option value="">All Categories</option>
                        <option value="Programming">Programming</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="Languages">Languages</option>
                        <option value="History">History</option>
                    </select>
                    
                    <select
                        value={filters.level}
                        onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                    >
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                    </select>
                    
                    <input
                        type="text"
                        placeholder="Search paths..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
            </div>

            <div className="paths-grid">
                {learningPaths.map(path => (
                    <motion.div
                        key={path._id}
                        className="path-card"
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="path-header">
                            <h3>{path.title}</h3>
                            <span className={`level-badge ${path.level}`}>
                                {path.level}
                            </span>
                        </div>
                        
                        <p className="path-description">{path.description}</p>
                        
                        <div className="path-stats">
                            <div className="stat">
                                <span className="stat-icon">🎯</span>
                                <span>{path.nodes.length} Concepts</span>
                            </div>
                            <div className="stat">
                                <span className="stat-icon">⏱️</span>
                                <span>{path.estimatedDuration}h</span>
                            </div>
                            <div className="stat">
                                <span className="stat-icon">👥</span>
                                <span>{path.stats.totalLearners} Learners</span>
                            </div>
                        </div>
                        
                        {path.userProgress && (
                            <div className="path-progress">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ width: `${path.userProgress.overallProgress}%` }}
                                    />
                                </div>
                                <span>{path.userProgress.overallProgress}% Complete</span>
                            </div>
                        )}
                        
                        <div className="path-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => openPathViewer(path._id)}
                            >
                                View Details
                            </button>
                            {!path.userProgress ? (
                                <button
                                    className="btn-primary"
                                    onClick={() => startLearningPath(path._id)}
                                >
                                    Start Learning
                                </button>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={() => openPathViewer(path._id)}
                                >
                                    Continue
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );

    const renderMyPathsTab = () => (
        <motion.div
            className="my-learning-paths"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="my-paths-header">
                <h2>📚 My Learning Journey</h2>
                <p>Track your progress across all learning paths</p>
            </div>

            {myPaths.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🗺️</div>
                    <h3>No Learning Paths Yet</h3>
                    <p>Start your learning journey by exploring available paths</p>
                    <button
                        className="btn-primary"
                        onClick={() => setActiveTab('explore')}
                    >
                        Explore Paths
                    </button>
                </div>
            ) : (
                <div className="my-paths-grid">
                    {myPaths.map(path => (
                        <motion.div
                            key={path._id}
                            className="my-path-card"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="path-status">
                                <span className={`status-badge ${path.userProgress.status}`}>
                                    {path.userProgress.status.replace('_', ' ')}
                                </span>
                                <span className="progress-percent">
                                    {path.userProgress.overallProgress}%
                                </span>
                            </div>
                            
                            <h3>{path.title}</h3>
                            
                            <div className="progress-visual">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ width: `${path.userProgress.overallProgress}%` }}
                                    />
                                </div>
                            </div>
                            
                            <div className="path-details">
                                <div className="detail">
                                    <span className="detail-label">Time Spent:</span>
                                    <span>{Math.round(path.userProgress.timeSpent / 60)}h</span>
                                </div>
                                <div className="detail">
                                    <span className="detail-label">Category:</span>
                                    <span>{path.category}</span>
                                </div>
                            </div>
                            
                            <button
                                className="btn-primary"
                                onClick={() => openPathViewer(path._id)}
                            >
                                Continue Learning
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );

    const renderSkillTree = () => {
        if (!skillTreeData) return null;

        return (
            <div className="skill-tree-container">
                <svg ref={svgRef} className="skill-tree-svg">
                    {/* Render connections */}
                    {skillTreeData.links.map((link, index) => {
                        const sourceNode = skillTreeData.nodes.find(n => n.id === link.source);
                        const targetNode = skillTreeData.nodes.find(n => n.id === link.target);
                        
                        if (!sourceNode || !targetNode) return null;
                        
                        return (
                            <line
                                key={index}
                                x1={sourceNode.position.x}
                                y1={sourceNode.position.y}
                                x2={targetNode.position.x}
                                y2={targetNode.position.y}
                                stroke="#e2e8f0"
                                strokeWidth="2"
                                strokeDasharray={targetNode.status === 'locked' ? '5,5' : 'none'}
                            />
                        );
                    })}
                    
                    {/* Render nodes */}
                    {skillTreeData.nodes.map(node => (
                        <g key={node.id}>
                            <circle
                                cx={node.position.x}
                                cy={node.position.y}
                                r="30"
                                fill={getNodeColor(node.status)}
                                stroke={node.status === 'completed' ? '#48bb78' : '#e2e8f0'}
                                strokeWidth="3"
                                className="skill-node"
                                onClick={() => setSelectedNode(node)}
                                style={{ cursor: 'pointer' }}
                            />
                            
                            {/* Mastery indicator */}
                            {node.status === 'completed' && (
                                <circle
                                    cx={node.position.x}
                                    cy={node.position.y}
                                    r="25"
                                    fill="none"
                                    stroke="#48bb78"
                                    strokeWidth="4"
                                    strokeDasharray={`${(node.mastery / 100) * 157} 157`}
                                    transform={`rotate(-90 ${node.position.x} ${node.position.y})`}
                                />
                            )}
                            
                            {/* Node type icon */}
                            <text
                                x={node.position.x}
                                y={node.position.y + 5}
                                textAnchor="middle"
                                fontSize="20"
                                fill="white"
                            >
                                {getNodeIcon(node.type)}
                            </text>
                        </g>
                    ))}
                </svg>
                
                {/* Node details panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            className="node-details-panel"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                        >
                            <div className="panel-header">
                                <h3>{selectedNode.title}</h3>
                                <button onClick={() => setSelectedNode(null)}>×</button>
                            </div>
                            
                            <div className="panel-content">
                                <p>{selectedNode.description}</p>
                                
                                <div className="node-stats">
                                    <div className="stat">
                                        <span>Status:</span>
                                        <span className={`status ${selectedNode.status}`}>
                                            {selectedNode.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    
                                    {selectedNode.status === 'completed' && (
                                        <div className="stat">
                                            <span>Mastery:</span>
                                            <span>{selectedNode.mastery}%</span>
                                        </div>
                                    )}
                                    
                                    <div className="stat">
                                        <span>Estimated Time:</span>
                                        <span>{selectedNode.estimatedTime} min</span>
                                    </div>
                                </div>
                                
                                {selectedNode.status === 'available' && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            updateNodeProgress(currentPath.path._id, selectedNode.id, 'in_progress');
                                            setSelectedNode(null);
                                        }}
                                    >
                                        Start Learning
                                    </button>
                                )}
                                
                                {selectedNode.status === 'in_progress' && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            updateNodeProgress(currentPath.path._id, selectedNode.id, 'completed', 85, 30);
                                            setSelectedNode(null);
                                        }}
                                    >
                                        Mark Complete
                                    </button>
                                )}
                                
                                {selectedNode.status === 'completed' && selectedNode.mastery < 80 && (
                                    <button
                                        className="btn-secondary"
                                        onClick={() => {
                                            updateNodeProgress(currentPath.path._id, selectedNode.id, 'completed', 95, 15);
                                            setSelectedNode(null);
                                        }}
                                    >
                                        Review & Improve
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderAnalyticsTab = () => {
        if (!analytics) return <div>Loading analytics...</div>;

        return (
            <motion.div
                className="learning-analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2>📊 Learning Analytics</h2>
                
                <div className="analytics-overview">
                    <div className="stat-card">
                        <div className="stat-icon">🗺️</div>
                        <div className="stat-content">
                            <h3>{analytics.totalPaths}</h3>
                            <p>Learning Paths</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <h3>{analytics.completedPaths}</h3>
                            <p>Completed</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-content">
                            <h3>{Math.round(analytics.totalTimeSpent / 60)}h</h3>
                            <p>Time Invested</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">🚀</div>
                        <div className="stat-content">
                            <h3>{Math.round(analytics.averageProgress)}%</h3>
                            <p>Avg Progress</p>
                        </div>
                    </div>
                </div>
                
                <div className="analytics-details">
                    <div className="strengths-weaknesses">
                        <div className="strengths">
                            <h3>💪 Your Strengths</h3>
                            {analytics.strengths.length > 0 ? (
                                <ul>
                                    {analytics.strengths.map((strength, index) => (
                                        <li key={index}>{strength}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Complete more paths to identify strengths</p>
                            )}
                        </div>
                        
                        <div className="weaknesses">
                            <h3>🎯 Areas to Improve</h3>
                            {analytics.weaknesses.length > 0 ? (
                                <ul>
                                    {analytics.weaknesses.map((weakness, index) => (
                                        <li key={index}>{weakness}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Great job! No significant weaknesses identified</p>
                            )}
                        </div>
                    </div>
                    
                    {analytics.upcomingReviews.length > 0 && (
                        <div className="upcoming-reviews">
                            <h3>📅 Upcoming Reviews</h3>
                            <div className="reviews-list">
                                {analytics.upcomingReviews.map((review, index) => (
                                    <div key={index} className="review-item">
                                        <span className="review-path">{review.pathTitle}</span>
                                        <span className="review-date">
                                            {new Date(review.reviewDate).toLocaleDateString()}
                                        </span>
                                        <span className={`mastery-level ${getMasteryLevel(review.mastery)}`}>
                                            {review.mastery}% mastery
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    const renderCompetenciesTab = () => (
        <motion.div
            className="competencies-overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <h2>🎯 Skills & Competencies</h2>
            
            {competencies.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎯</div>
                    <h3>No Competencies Tracked Yet</h3>
                    <p>Complete quizzes and learning paths to build your skill profile</p>
                </div>
            ) : (
                <div className="competencies-grid">
                    {competencies.map(competency => (
                        <motion.div
                            key={competency._id}
                            className="competency-card"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="competency-header">
                                <h3>{competency.competency.name}</h3>
                                <span className={`level-badge ${competency.competency.level}`}>
                                    {competency.competency.level}
                                </span>
                            </div>
                            
                            <div className="competency-progress">
                                <div className="progress-circle">
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path
                                            className="circle-bg"
                                            d="M18 2.0845
                                               a 15.9155 15.9155 0 0 1 0 31.831
                                               a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="circle"
                                            strokeDasharray={`${competency.currentLevel}, 100`}
                                            d="M18 2.0845
                                               a 15.9155 15.9155 0 0 1 0 31.831
                                               a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <text x="18" y="20.35" className="percentage">
                                            {Math.round(competency.currentLevel)}%
                                        </text>
                                    </svg>
                                </div>
                            </div>
                            
                            <p className="competency-description">
                                {competency.competency.description}
                            </p>
                            
                            {competency.masteryDate && (
                                <div className="mastery-badge">
                                    🏆 Mastered on {new Date(competency.masteryDate).toLocaleDateString()}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );

    const getNodeColor = (status) => {
        const colors = {
            locked: '#cbd5e0',
            available: '#4299e1',
            in_progress: '#ed8936',
            completed: '#48bb78',
            mastered: '#38b2ac'
        };
        return colors[status] || colors.locked;
    };

    const getNodeIcon = (type) => {
        const icons = {
            concept: '📖',
            skill: '🔧',
            milestone: '🏆',
            assessment: '📝',
            project: '🚀'
        };
        return icons[type] || '📖';
    };

    const getMasteryLevel = (mastery) => {
        if (mastery >= 80) return 'high';
        if (mastery >= 60) return 'medium';
        return 'low';
    };

    if (loading) {
        return (
            <div className="learning-path-hub loading">
                <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                </div>
                <p>Loading Learning Path Hub...</p>
            </div>
        );
    }

    return (
        <div className="learning-path-hub">
            <motion.div
                className="hub-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1>🗺️ Learning Path Hub</h1>
                <p>Master skills through structured, adaptive learning journeys</p>
            </motion.div>

            <div className="hub-navigation">
                {[
                    { id: 'explore', label: 'Explore', icon: '🔍' },
                    { id: 'my-paths', label: 'My Journey', icon: '📚' },
                    { id: 'analytics', label: 'Analytics', icon: '📊' },
                    { id: 'competencies', label: 'Skills', icon: '🎯' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="hub-content">
                <AnimatePresence mode="wait">
                    {activeTab === 'explore' && renderExploreTab()}
                    {activeTab === 'my-paths' && renderMyPathsTab()}
                    {activeTab === 'analytics' && renderAnalyticsTab()}
                    {activeTab === 'competencies' && renderCompetenciesTab()}
                </AnimatePresence>
            </div>

            {/* Path Viewer Modal */}
            <AnimatePresence>
                {currentPath && (
                    <motion.div
                        className="path-viewer-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCurrentPath(null)}
                    >
                        <motion.div
                            className="path-viewer-content"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="viewer-header">
                                <div className="path-info">
                                    <h2>{currentPath.path.title}</h2>
                                    <p>{currentPath.path.description}</p>
                                </div>
                                <button
                                    className="close-viewer"
                                    onClick={() => setCurrentPath(null)}
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="viewer-body">
                                {renderSkillTree()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LearningPathHub;
