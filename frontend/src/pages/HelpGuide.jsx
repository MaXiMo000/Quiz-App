import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './HelpGuide.css';

const HelpGuide = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [activeSubSection, setActiveSubSection] = useState(null);

    const sections = [
        {
            id: 'overview',
            title: 'Website Overview',
            icon: '🏠',
            content: {
                description: 'QuizNest is your ultimate learning companion! Think of it as your personal study buddy that helps you learn through interactive quizzes, track your progress, and compete with friends.',
                features: [
                    '📚 Take quizzes on various topics',
                    '📊 Track your learning progress',
                    '🏆 Earn achievements and XP',
                    '👥 Compete with friends',
                    '🎨 Customize your experience',
                    '📱 Works on all devices'
                ]
            }
        },
        {
            id: 'user-types',
            title: 'User Types Explained',
            icon: '👥',
            content: {
                description: 'We have three types of users, each with different features and capabilities:',
                subsections: [
                    {
                        id: 'simple-user',
                        title: '👤 Simple User (Free)',
                        features: [
                            'Take unlimited quizzes',
                            'View your quiz reports',
                            'Earn XP and achievements',
                            'Compete on leaderboards',
                            'Basic analytics',
                            'Social features (friends, challenges)',
                            'Customize themes'
                        ],
                        limitations: [
                            'Cannot create your own quizzes',
                            'Limited advanced analytics',
                            'No AI study buddy access',
                            'No premium dashboard'
                        ]
                    },
                    {
                        id: 'premium-user',
                        title: '🚀 Premium User (Paid)',
                        features: [
                            'Everything from Simple User',
                            'Create your own quizzes',
                            'Advanced analytics dashboard',
                            'AI-powered study recommendations',
                            'Intelligence dashboard',
                            'Premium quiz collections',
                            'Priority support',
                            'Advanced learning paths'
                        ],
                        benefits: 'Get the full learning experience with advanced features!'
                    },
                    {
                        id: 'admin-user',
                        title: '👑 Admin User',
                        features: [
                            'Everything from Premium User',
                            'Manage all quizzes',
                            'View all user reports',
                            'Create and manage written tests',
                            'Access admin dashboard',
                            'Moderate content',
                            'System management tools'
                        ],
                        note: 'Admin users help maintain the platform and create content for everyone.'
                    }
                ]
            }
        },
        {
            id: 'how-to-use',
            title: 'How to Use QuizNest',
            icon: '🎯',
            content: {
                description: 'Follow these simple steps to get the most out of QuizNest:',
                steps: [
                    {
                        step: 1,
                        title: 'Sign Up & Login',
                        description: 'Create your account or login with Google. Choose your role (Simple, Premium, or Admin).'
                    },
                    {
                        step: 2,
                        title: 'Take Your First Quiz',
                        description: 'Go to "Quizzes" in the sidebar, pick a topic, and start answering questions. Don\'t worry about getting everything right - it\'s about learning!'
                    },
                    {
                        step: 3,
                        title: 'Check Your Progress',
                        description: 'Visit "Reports" to see how you\'re doing. Track your scores, time spent, and improvement over time.'
                    },
                    {
                        step: 4,
                        title: 'Earn Achievements',
                        description: 'Complete quizzes to earn XP and unlock achievements. The more you learn, the more rewards you get!'
                    },
                    {
                        step: 5,
                        title: 'Compete & Socialize',
                        description: 'Check the leaderboards, add friends, and participate in challenges to make learning fun!'
                    }
                ]
            }
        },
        {
            id: 'creating-quizzes',
            title: 'Creating Your Own Quizzes (Premium)',
            icon: '📝',
            content: {
                description: 'As a Premium user, you can create your own quizzes to share with others or use for personal study:',
                steps: [
                    {
                        step: 1,
                        title: 'Go to "My Quizzes"',
                        description: 'Click on "My Quizzes" in the sidebar to access the quiz creation area.'
                    },
                    {
                        step: 2,
                        title: 'Create New Quiz',
                        description: 'Click "Create New Quiz" and fill in the basic information: title, description, and category.'
                    },
                    {
                        step: 3,
                        title: 'Add Questions',
                        description: 'Add multiple-choice questions with 4 options each. Make sure to mark the correct answer!'
                    },
                    {
                        step: 4,
                        title: 'Set Quiz Settings',
                        description: 'Choose time limits, difficulty level, and whether it should be public or private.'
                    },
                    {
                        step: 5,
                        title: 'Publish & Share',
                        description: 'Publish your quiz and share the link with friends or make it available for everyone!'
                    }
                ],
                tips: [
                    'Write clear, concise questions',
                    'Make sure there\'s only one correct answer',
                    'Use interesting and relevant topics',
                    'Test your quiz before publishing',
                    'Add helpful explanations for answers'
                ]
            }
        },
        {
            id: 'features-guide',
            title: 'Features Guide',
            icon: '✨',
            content: {
                description: 'Explore all the amazing features QuizNest has to offer:',
                features: [
                    {
                        name: '📊 Dashboard',
                        description: 'Your personal homepage showing your progress, recent activity, and quick access to features.'
                    },
                    {
                        name: '📚 Quizzes',
                        description: 'Browse and take quizzes on various topics. Filter by category, difficulty, or popularity.'
                    },
                    {
                        name: '📄 Reports',
                        description: 'Detailed analysis of your quiz performance, including scores, time taken, and improvement trends.'
                    },
                    {
                        name: '🏆 Achievements',
                        description: 'Unlock badges and achievements as you complete quizzes and reach milestones.'
                    },
                    {
                        name: '👥 Friends',
                        description: 'Add friends, see their progress, and compete in friendly challenges.'
                    },
                    {
                        name: '🎮 Challenges',
                        description: 'Participate in tournaments and special events to win prizes and recognition.'
                    },
                    {
                        name: '🎨 Themes',
                        description: 'Customize the look and feel of QuizNest with beautiful themes and color schemes.'
                    },
                    {
                        name: '📱 Mobile App',
                        description: 'Access QuizNest on your phone with our responsive design and PWA features.'
                    }
                ]
            }
        },
        {
            id: 'tips-tricks',
            title: 'Tips & Tricks',
            icon: '💡',
            content: {
                description: 'Get the most out of QuizNest with these helpful tips:',
                tips: [
                    {
                        category: '🎯 Learning Effectively',
                        items: [
                            'Take quizzes regularly to reinforce learning',
                            'Review wrong answers to understand mistakes',
                            'Use the reports to identify weak areas',
                            'Set learning goals and track progress'
                        ]
                    },
                    {
                        category: '🏆 Maximizing XP',
                        items: [
                            'Complete quizzes faster for bonus XP',
                            'Answer questions correctly for more points',
                            'Participate in daily challenges',
                            'Maintain a streak for bonus rewards'
                        ]
                    },
                    {
                        category: '👥 Social Features',
                        items: [
                            'Add friends to see their progress',
                            'Join study groups for collaborative learning',
                            'Participate in tournaments for recognition',
                            'Share your achievements on social media'
                        ]
                    },
                    {
                        category: '📱 Mobile Usage',
                        items: [
                            'Install as PWA for app-like experience',
                            'Use offline mode for studying anywhere',
                            'Enable notifications for reminders',
                            'Sync progress across all devices'
                        ]
                    }
                ]
            }
        },
        {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            icon: '🔧',
            content: {
                description: 'Having issues? Here are solutions to common problems:',
                problems: [
                    {
                        problem: 'Quiz not loading',
                        solutions: [
                            'Check your internet connection',
                            'Refresh the page',
                            'Clear browser cache',
                            'Try a different browser'
                        ]
                    },
                    {
                        problem: 'Can\'t see my progress',
                        solutions: [
                            'Make sure you\'re logged in',
                            'Check the Reports section',
                            'Wait a few minutes for data to sync',
                            'Contact support if issue persists'
                        ]
                    },
                    {
                        problem: 'Mobile app not working',
                        solutions: [
                            'Update your browser',
                            'Clear app data and reinstall',
                            'Check if PWA is properly installed',
                            'Restart your device'
                        ]
                    },
                    {
                        problem: 'Premium features not available',
                        solutions: [
                            'Verify your premium subscription',
                            'Log out and log back in',
                            'Check payment status',
                            'Contact support for assistance'
                        ]
                    }
                ]
            }
        }
    ];

    const getCurrentContent = () => {
        const section = sections.find(s => s.id === activeSection);
        if (!section) return null;

        if (section.id === 'user-types' && activeSubSection) {
            const subSection = section.content.subsections.find(s => s.id === activeSubSection);
            return subSection ? { ...section, content: subSection } : section;
        }

        return section;
    };

    const currentContent = getCurrentContent();

    return (
        <div className="help-guide-container">
            <div className="help-guide-header">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    📚 QuizNest Help Guide
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="help-subtitle"
                >
                    Everything you need to know about QuizNest in simple, easy-to-understand language
                </motion.p>
            </div>

            <div className="help-guide-content">
                {/* Navigation Sidebar */}
                <motion.aside
                    className="help-navigation"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <h3>📖 Table of Contents</h3>
                    <nav className="help-nav">
                        {sections.map((section) => (
                            <motion.button
                                key={section.id}
                                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveSection(section.id);
                                    setActiveSubSection(null);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="nav-icon">{section.icon}</span>
                                <span className="nav-text">{section.title}</span>
                            </motion.button>
                        ))}
                    </nav>
                </motion.aside>

                {/* Main Content */}
                <motion.main
                    className="help-main-content"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <AnimatePresence mode="wait">
                        {currentContent && (
                            <motion.div
                                key={activeSection + activeSubSection}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="help-section"
                            >
                                <div className="section-header">
                                    <h2>
                                        <span className="section-icon">{currentContent.icon}</span>
                                        {currentContent.title}
                                    </h2>
                                </div>

                                <div className="section-content">
                                    {currentContent.content.description && (
                                        <p className="section-description">
                                            {currentContent.content.description}
                                        </p>
                                    )}

                                    {/* User Types Sub-navigation */}
                                    {activeSection === 'user-types' && (
                                        <div className="user-types-nav">
                                            {currentContent.content.subsections && currentContent.content.subsections.map((subSection) => (
                                                <motion.button
                                                    key={subSection.id}
                                                    className={`user-type-btn ${activeSubSection === subSection.id ? 'active' : ''}`}
                                                    onClick={() => setActiveSubSection(subSection.id)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    {subSection.title}
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Features List */}
                                    {currentContent.content.features && (
                                        <div className="features-list">
                                            {currentContent.content.features && currentContent.content.features.map((feature, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="feature-item"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                                >
                                                    {typeof feature === 'string' ? (
                                                        <span className="feature-text">{feature}</span>
                                                    ) : (
                                                        <div className="feature-card">
                                                            <h4>{feature.name}</h4>
                                                            <p>{feature.description}</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Steps List */}
                                    {currentContent.content.steps && (
                                        <div className="steps-list">
                                            {currentContent.content.steps && currentContent.content.steps.map((step, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="step-item"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                                >
                                                    <div className="step-number">{step.step}</div>
                                                    <div className="step-content">
                                                        <h4>{step.title}</h4>
                                                        <p>{step.description}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tips List */}
                                    {currentContent.content.tips && (
                                        <div className="tips-list">
                                            {currentContent.content.tips && currentContent.content.tips.map((tip, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="tip-category"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                                >
                                                    {typeof tip === 'string' ? (
                                                        <li>{tip}</li>
                                                    ) : (
                                                        <>
                                                            <h4>{tip.category}</h4>
                                                            <ul>
                                                                {tip.items && tip.items.map((item, itemIndex) => (
                                                                    <li key={itemIndex}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Problems List */}
                                    {currentContent.content.problems && (
                                        <div className="problems-list">
                                            {currentContent.content.problems && currentContent.content.problems.map((problem, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="problem-item"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                                >
                                                    <h4>❌ {problem.problem}</h4>
                                                    <ul>
                                                        {problem.solutions && problem.solutions.map((solution, solutionIndex) => (
                                                            <li key={solutionIndex}>✅ {solution}</li>
                                                        ))}
                                                    </ul>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Limitations */}
                                    {currentContent.content.limitations && (
                                        <div className="limitations-list">
                                            <h4>⚠️ Limitations</h4>
                                            <ul>
                                                {currentContent.content.limitations && currentContent.content.limitations.map((limitation, index) => (
                                                    <li key={index}>{limitation}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Benefits */}
                                    {currentContent.content.benefits && (
                                        <div className="benefits-highlight">
                                            <h4>🎉 Benefits</h4>
                                            <p>{currentContent.content.benefits}</p>
                                        </div>
                                    )}

                                    {/* Note */}
                                    {currentContent.content.note && (
                                        <div className="note-highlight">
                                            <h4>📝 Note</h4>
                                            <p>{currentContent.content.note}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.main>
            </div>

            {/* Quick Help Footer */}
            <motion.footer
                className="help-footer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
            >
                <div className="quick-help">
                    <h3>🚀 Quick Help</h3>
                    <div className="quick-help-buttons">
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('troubleshooting')}
                        >
                            🔧 Need Help?
                        </motion.button>
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('user-types')}
                        >
                            👥 User Types
                        </motion.button>
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('creating-quizzes')}
                        >
                            📝 Create Quizzes
                        </motion.button>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
};

export default HelpGuide;
