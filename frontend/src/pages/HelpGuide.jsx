import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './HelpGuide.css';

const HelpGuide = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [activeSubSection, setActiveSubSection] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSections, setFilteredSections] = useState([]);

    const sections = [
        {
            id: 'overview',
            title: 'Website Overview',
            icon: '🏠',
            content: {
                description: 'QuizNest is your ultimate learning companion! Think of it as your personal study buddy that helps you learn through interactive quizzes, track your progress, and compete with friends. Our platform combines gamification, AI-powered insights, and social learning to make education engaging and effective.',
                features: [
                    '📚 Take unlimited quizzes on various topics',
                    '📊 Advanced analytics and progress tracking',
                    '🏆 Comprehensive achievement system with XP rewards',
                    '👥 Social features: friends, challenges, and leaderboards',
                    '🎨 Beautiful themes and customizable interface',
                    '📱 Progressive Web App (PWA) - works offline',
                    '🤖 AI-powered study recommendations',
                    '📈 Learning paths and personalized content',
                    '⏰ Spaced repetition for better retention',
                    '🎯 Real-time multiplayer quizzes',
                    '📝 Create and share your own quizzes (Premium)',
                    '📊 Detailed performance reports and insights'
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
            id: 'advanced-features',
            title: 'Advanced Features',
            icon: '🚀',
            content: {
                description: 'Discover the powerful advanced features that make QuizNest stand out from other learning platforms:',
                features: [
                    {
                        name: '🤖 AI Study Buddy',
                        description: 'Get personalized study recommendations based on your performance patterns and learning style. The AI analyzes your strengths and weaknesses to suggest the most effective study materials.'
                    },
                    {
                        name: '📈 Intelligence Dashboard',
                        description: 'Advanced analytics showing your cognitive performance, learning velocity, and knowledge retention patterns. Track your intellectual growth over time.'
                    },
                    {
                        name: '⏰ Spaced Repetition System',
                        description: 'Scientifically-proven learning technique that schedules review sessions at optimal intervals to maximize long-term retention.'
                    },
                    {
                        name: '🎯 Real-time Multiplayer Quizzes',
                        description: 'Compete with friends and other users in live quiz sessions. See who answers fastest and most accurately!'
                    },
                    {
                        name: '📊 Advanced Analytics',
                        description: 'Detailed performance metrics including accuracy trends, time analysis, topic mastery levels, and personalized insights.'
                    },
                    {
                        name: '📚 Learning Paths',
                        description: 'Structured learning journeys designed to take you from beginner to expert in any subject area.'
                    },
                    {
                        name: '🏆 Achievement System',
                        description: 'Unlock badges and achievements as you reach milestones. Collect rare achievements for special accomplishments.'
                    },
                    {
                        name: '👥 Study Groups',
                        description: 'Create or join study groups to collaborate with peers, share resources, and learn together.'
                    }
                ]
            }
        },
        {
            id: 'analytics-insights',
            title: 'Analytics & Insights',
            icon: '📊',
            content: {
                description: 'Understand your learning patterns and optimize your study strategy with our comprehensive analytics:',
                features: [
                    {
                        name: '📈 Performance Trends',
                        description: 'Track your improvement over time with detailed charts showing accuracy, speed, and consistency trends.'
                    },
                    {
                        name: '🎯 Topic Mastery',
                        description: 'See which topics you\'ve mastered and which need more practice. Color-coded indicators show your proficiency level.'
                    },
                    {
                        name: '⏱️ Time Analysis',
                        description: 'Understand how long you spend on different types of questions and optimize your pacing strategy.'
                    },
                    {
                        name: '🧠 Cognitive Load Tracking',
                        description: 'Monitor your mental effort and identify when you\'re most productive for different types of learning.'
                    },
                    {
                        name: '📅 Study Patterns',
                        description: 'Discover your optimal study times and patterns to maximize learning efficiency.'
                    },
                    {
                        name: '🎲 Difficulty Progression',
                        description: 'See how you handle increasing difficulty levels and identify areas for improvement.'
                    }
                ]
            }
        },
        {
            id: 'mobile-pwa',
            title: 'Mobile & PWA Features',
            icon: '📱',
            content: {
                description: 'QuizNest works seamlessly across all devices with our Progressive Web App technology:',
                features: [
                    {
                        name: '📱 Install as App',
                        description: 'Add QuizNest to your home screen for a native app experience. Works on iOS, Android, and desktop.'
                    },
                    {
                        name: '🌐 Offline Mode',
                        description: 'Download quizzes and study materials to access them without internet connection. Perfect for studying on the go.'
                    },
                    {
                        name: '🔔 Smart Notifications',
                        description: 'Get personalized study reminders, achievement notifications, and challenge invitations.'
                    },
                    {
                        name: '🔄 Sync Across Devices',
                        description: 'Your progress automatically syncs across all your devices. Start on desktop, continue on mobile.'
                    },
                    {
                        name: '👆 Touch Optimized',
                        description: 'Beautiful, responsive interface designed specifically for touch interactions on mobile devices.'
                    },
                    {
                        name: '⚡ Fast Loading',
                        description: 'Optimized for speed with instant loading and smooth animations on all devices.'
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
                            'Refresh the page (Ctrl+F5 or Cmd+Shift+R)',
                            'Clear browser cache and cookies',
                            'Try a different browser or incognito mode',
                            'Disable browser extensions temporarily',
                            'Check if JavaScript is enabled'
                        ]
                    },
                    {
                        problem: 'Can\'t see my progress',
                        solutions: [
                            'Make sure you\'re logged in with the correct account',
                            'Check the Reports section in the sidebar',
                            'Wait a few minutes for data to sync',
                            'Try refreshing the page',
                            'Clear browser cache',
                            'Contact support if issue persists'
                        ]
                    },
                    {
                        problem: 'Mobile app not working',
                        solutions: [
                            'Update your browser to the latest version',
                            'Clear app data and reinstall the PWA',
                            'Check if PWA is properly installed',
                            'Restart your device',
                            'Check available storage space',
                            'Try accessing via browser first'
                        ]
                    },
                    {
                        problem: 'Premium features not available',
                        solutions: [
                            'Verify your premium subscription status',
                            'Log out and log back in',
                            'Check payment status in your account',
                            'Wait up to 24 hours for activation',
                            'Contact support for assistance',
                            'Check if you\'re using the correct account'
                        ]
                    },
                    {
                        problem: 'Slow performance',
                        solutions: [
                            'Close unnecessary browser tabs',
                            'Clear browser cache and cookies',
                            'Check your internet connection speed',
                            'Try using a different browser',
                            'Restart your device',
                            'Check available RAM and storage'
                        ]
                    },
                    {
                        problem: 'Can\'t create quizzes',
                        solutions: [
                            'Verify you have a Premium subscription',
                            'Check if you\'re logged in as Premium user',
                            'Try refreshing the page',
                            'Clear browser cache',
                            'Check if all required fields are filled',
                            'Contact support if issue persists'
                        ]
                    }
                ]
            }
        }
    ];

    // Search functionality
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredSections([]);
            return;
        }

        const filtered = sections.filter(section => {
            const searchText = query.toLowerCase();
            return (
                section.title.toLowerCase().includes(searchText) ||
                section.content.description.toLowerCase().includes(searchText) ||
                (section.content.features && section.content.features.some(feature =>
                    typeof feature === 'string' ? feature.toLowerCase().includes(searchText) :
                    feature.name.toLowerCase().includes(searchText) || feature.description.toLowerCase().includes(searchText)
                )) ||
                (section.content.steps && section.content.steps.some(step =>
                    step.title.toLowerCase().includes(searchText) || step.description.toLowerCase().includes(searchText)
                )) ||
                (section.content.tips && section.content.tips.some(tip =>
                    typeof tip === 'string' ? tip.toLowerCase().includes(searchText) :
                    tip.category.toLowerCase().includes(searchText) ||
                    (tip.items && tip.items.some(item => item.toLowerCase().includes(searchText)))
                ))
            );
        });
        setFilteredSections(filtered);
    };

    const getCurrentContent = () => {
        const section = sections.find(s => s.id === activeSection);
        if (!section) return null;

        if (section.id === 'user-types' && activeSubSection) {
            const subSection = section.content.subsections.find(s => s.id === activeSubSection);
            return subSection ? { ...section, content: subSection } : section;
        }

        return section;
    };

    const displaySections = searchQuery ? filteredSections : sections;

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

                    {/* Search Bar */}
                    <div className="help-search-container">
                        <div className="help-search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search help topics..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="help-search-input"
                            />
                            {searchQuery && (
                                <button
                                    className="search-clear-btn"
                                    onClick={() => handleSearch('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <nav className="help-nav">
                        {displaySections.map((section) => (
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

                        {searchQuery && filteredSections.length === 0 && (
                            <div className="no-results">
                                <p>No results found for "{searchQuery}"</p>
                                <button
                                    className="clear-search-btn"
                                    onClick={() => handleSearch('')}
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
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
                            onClick={() => setActiveSection('advanced-features')}
                        >
                            🚀 Advanced Features
                        </motion.button>
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('mobile-pwa')}
                        >
                            📱 Mobile & PWA
                        </motion.button>
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('creating-quizzes')}
                        >
                            📝 Create Quizzes
                        </motion.button>
                        <motion.button
                            className="quick-help-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection('analytics-insights')}
                        >
                            📊 Analytics
                        </motion.button>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
};

export default HelpGuide;
