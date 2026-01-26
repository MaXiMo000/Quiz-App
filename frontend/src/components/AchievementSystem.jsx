import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import Loading from './Loading';
import NotificationModal from './NotificationModal';
import { useNotification } from '../hooks/useNotification';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './AchievementSystem.css';

const AchievementSystem = ({ _userId }) => {
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotification, setShowNotification] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked

  // Notification system
  const { notification, showError, hideNotification } = useNotification();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Escape': () => {
      if (showNotification) {
        setShowNotification(null);
      }
    },
  }, [showNotification]);

  // Fetch achievements from API
  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id;

      if (!userId) {
        throw new Error('User not found. Please log in again.');
      }

      const response = await axios.get(`/api/achievements/${userId}`);

      if (response.data && response.status === 200) {
        setAchievements({
          unlocked: response.data.unlocked || [],
          locked: response.data.locked || [],
          recent: response.data.recent || [],
          total: response.data.total || 0
        });
      } else {
        throw new Error('Invalid response from server');
      }
      } catch (error) {
      const errorMsg = error.message || 'Failed to load achievements';
      setError(errorMsg);
      showError(errorMsg);

      // Set empty state on error instead of mock data
      setAchievements({
        unlocked: [],
        locked: [],
        recent: [],
        total: 0
      });
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Loading state
  if (loading) {
    return <Loading fullScreen={true} />;
  }

  // Error state with fallback
  if (error) {
    return (
      <div className="achievement-system">
        <div className="achievement-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
        <div className="achievement-error">
          <p>⚠️ {error}</p>
          <p>Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Streaks': '🔥',
      'Learning Progress': '📚',
      'Performance': '🎯',
      'Perfect Scores': '💯',
      'Subject Mastery': '🧠',
      'Levels': '⭐',
      'Time-Based': '⏰',
      'Consistency': '📊',
      'Speed': '⚡',
      'Diversity': '🎭',
      'Special': '🏆'
    };
    return icons[categoryName] || '🏅';
  };

  const getRarityStyle = (rarity) => {
    // Use CSS variables for theming support
    const styles = {
      common: {
        border: '2px solid var(--text-muted, #9ca3af)',
        glow: '0 0 15px var(--text-muted-transparent, rgba(156, 163, 175, 0.3))'
      },
      rare: {
        border: '2px solid var(--info, #3b82f6)',
        glow: '0 0 15px var(--info-light, rgba(59, 130, 246, 0.4))'
      },
      epic: {
        border: '2px solid var(--accent2, #8b5cf6)',
        glow: '0 0 15px var(--accent2-transparent-15, rgba(139, 92, 246, 0.4))'
      },
      legendary: {
        border: '2px solid var(--warning, #f59e0b)',
        glow: '0 0 20px var(--warning-light, rgba(245, 158, 11, 0.6))'
      }
    };
    return styles[rarity] || styles.common;
  };

  const allAchievements = [...achievements.unlocked, ...achievements.locked];
  const filteredAchievements = allAchievements.filter(achievement => {
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return true;
  });

  const getCompletionPercentage = () => {
    return allAchievements.length > 0
      ? Math.round((achievements.unlocked.length / allAchievements.length) * 100)
      : 0;
  };

  // Separate regular and near-impossible achievements
  const regularAchievements = filteredAchievements.filter(a => !a.nearImpossible);
  const nearImpossibleAchievements = filteredAchievements.filter(a => a.nearImpossible);

  // Group regular achievements by category
  const achievementsByCategory = {
    'Streaks': regularAchievements.filter(a => a.id.includes('streak') && !a.nearImpossible),
    'Learning Progress': regularAchievements.filter(a => a.id.includes('quiz') && !a.nearImpossible),
    'Performance': regularAchievements.filter(a => a.id.includes('score') && !a.nearImpossible),
    'Perfect Scores': regularAchievements.filter(a => a.id.startsWith('perfect_') && !a.nearImpossible),
    'Subject Mastery': regularAchievements.filter(a => (a.id.startsWith('category_') || a.id.startsWith('master_')) && !a.nearImpossible),
    'Levels': regularAchievements.filter(a => a.id.includes('level') && !a.nearImpossible),
    'Time-Based': regularAchievements.filter(a =>
      (a.id.includes('early_bird') ||
      a.id.includes('night_owl') ||
      a.id.includes('weekend') ||
      a.id.includes('daily_grind') ||
      a.id.includes('marathon') ||
      a.id.includes('complete')) && !a.nearImpossible
    ),
    'Consistency': regularAchievements.filter(a =>
      (a.id.includes('consistent') ||
      a.id.includes('improvement') ||
      a.id.includes('no_fail')) && !a.nearImpossible
    ),
    'Speed': regularAchievements.filter(a => (a.id.includes('speed') || a.id.includes('lightning')) && !a.nearImpossible),
    'Diversity': regularAchievements.filter(a => (a.id.includes('jack') || a.id.includes('master_of_all')) && !a.nearImpossible),
    'Special': regularAchievements.filter(a =>
      !['streak', 'quiz', 'score', 'perfect_', 'level', 'category_', 'master_', 'early_bird', 'night_owl', 'weekend', 'daily_grind', 'marathon', 'complete', 'consistent', 'improvement', 'no_fail', 'speed', 'lightning', 'jack', 'master_of_all'].some(type =>
        a.id.includes(type) || a.id.startsWith(type)
      ) && !a.nearImpossible
    )
  };

  return (
    <div className="achievement-system" role="main" aria-label="Achievement Center">
      {/* Floating Background Elements */}
      <div className="achievement-bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <motion.div
        className="achievement-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="achievement-main-title">
              <span className="title-icon">🏆</span>
              <span className="title-text">Achievement Center</span>
            </h1>
            <p className="header-subtitle">Unlock your potential, one achievement at a time</p>
          </div>

          <div className="progress-overview">
            <div className="completion-circle">
              <svg width="80" height="80" className="progress-ring">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="url(#progressGradient)"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - getCompletionPercentage() / 100)}`}
                  transform="rotate(-90 40 40)"
                  className="progress-circle"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent, #6366f1)" />
                    <stop offset="50%" stopColor="var(--accent2, #8b5cf6)" />
                    <stop offset="100%" stopColor="var(--accent2, #ec4899)" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="percentage-text">{getCompletionPercentage()}%</span>
            </div>
            <div className="progress-info">
              <p className="progress-main">{achievements.unlocked.length}/{allAchievements.length} Unlocked</p>
              <p className="progress-sub">Keep going to unlock more!</p>
            </div>
          </div>
        </div>

        <div className="filter-controls" role="tablist" aria-label="Filter achievements">
          {['all', 'unlocked', 'locked'].map(filterType => (
            <motion.button
              key={filterType}
              className={`filter-btn ${filter === filterType ? 'active' : ''}`}
              onClick={() => setFilter(filterType)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              role="tab"
              aria-selected={filter === filterType}
              aria-label={`Filter by ${filterType} achievements`}
            >
              <span className="filter-btn-text">
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="achievements-grid">
        {/* Regular Achievements */}
        {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => {
          if (categoryAchievements.length === 0) return null;

          return (
            <motion.div
              key={category}
              className="achievement-category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="category-title">
                {getCategoryIcon(category)} {category} ({categoryAchievements.filter(a => a.unlocked).length}/{categoryAchievements.length})
              </h3>
              <div className="category-achievements">
                {categoryAchievements.map((achievement, index) => {
                  const rarityStyle = getRarityStyle(achievement.rarity);
                  const iconEmoji = achievement.title.split(' ')[0];
                  const titleText = achievement.title.replace(/^[^\w\s]+/, '').trim();

                  return (
                    <motion.div
                      key={achievement.id}
                      className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                      style={{
                        border: rarityStyle.border,
                        boxShadow: achievement.unlocked ? rarityStyle.glow : 'none'
                      }}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        rotate: achievement.unlocked ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        rotate: achievement.unlocked ? { duration: 0.6, delay: index * 0.1 + 0.3 } : 0
                      }}
                      whileHover={{ scale: 1.05, y: -6 }}
                    >
                      <div className={`achievement-card-bg ${achievement.unlocked ? 'unlocked-bg' : ''}`}></div>

                      {achievement.unlocked && (
                        <div className="unlock-particles">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="particle" style={{
                              '--angle': `${i * 30}deg`,
                              '--delay': `${i * 0.05}s`
                            }}></div>
                          ))}
                        </div>
                      )}

                      <div className="achievement-icon-wrapper">
                        <motion.div
                          className={`achievement-icon ${achievement.unlocked ? 'unlocked-icon' : 'locked-icon'}`}
                          animate={achievement.unlocked ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                          } : {}}
                          transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                        >
                          {iconEmoji}
                        </motion.div>
                        {achievement.unlocked && (
                          <motion.div
                            className="unlock-badge"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, delay: index * 0.1 + 0.4 }}
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
                            </svg>
                          </motion.div>
                        )}
                      </div>

                      <div className="achievement-content">
                        <h4 className={`achievement-title ${achievement.unlocked ? 'unlocked-title' : ''}`}>
                          {titleText}
                        </h4>
                        <p className="achievement-description">{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className={`rarity-badge rarity-${achievement.rarity}`}>
                            {achievement.rarity}
                          </span>
                          {achievement.progress !== undefined && (
                            <div className="progress-container">
                              <div className="progress-bar">
                                <motion.div
                                  className={`progress-fill ${achievement.unlocked ? 'completed' : ''}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${achievement.progress}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                                ></motion.div>
                              </div>
                              <span className="progress-text">
                                {achievement.unlocked ? '✓ Complete' : `${Math.round(achievement.progress)}%`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Near Impossible Achievements Section */}
        {nearImpossibleAchievements.length > 0 && (
          <motion.div
            className="achievement-category near-impossible-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="category-title near-impossible-title">
              <span className="title-icon">⚡</span> Near Impossible ({nearImpossibleAchievements.filter(a => a.unlocked).length}/{nearImpossibleAchievements.length})
            </h3>
            <p className="near-impossible-description">
              These achievements are designed to be extremely challenging. Only the most dedicated players will unlock them!
            </p>
            <div className="category-achievements">
              {nearImpossibleAchievements.map((achievement, index) => {
                const rarityStyle = getRarityStyle(achievement.rarity);
                const iconEmoji = achievement.title.split(' ')[0];
                const titleText = achievement.title.replace(/^[^\w\s]+/, '').trim();

                return (
                    <motion.div
                      key={achievement.id}
                      className={`achievement-card near-impossible-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                      style={{
                        border: rarityStyle.border,
                        boxShadow: achievement.unlocked ? rarityStyle.glow : 'none'
                      }}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        rotate: achievement.unlocked ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        rotate: achievement.unlocked ? { duration: 0.6, delay: index * 0.1 + 0.3 } : 0
                      }}
                      whileHover={{ scale: 1.05, y: -6 }}
                    >
                    <div className={`achievement-card-bg ${achievement.unlocked ? 'unlocked-bg' : ''}`}></div>

                    {achievement.unlocked && (
                      <div className="unlock-particles">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="particle" style={{
                            '--angle': `${i * 30}deg`,
                            '--delay': `${i * 0.05}s`
                          }}></div>
                        ))}
                      </div>
                    )}

                    <div className="achievement-icon-wrapper">
                      <motion.div
                        className={`achievement-icon ${achievement.unlocked ? 'unlocked-icon' : 'locked-icon'}`}
                        animate={achievement.unlocked ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        } : {}}
                        transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                      >
                        {iconEmoji}
                      </motion.div>
                      {achievement.unlocked && (
                        <motion.div
                          className="unlock-badge"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, delay: index * 0.1 + 0.4 }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
                          </svg>
                        </motion.div>
                      )}
                    </div>

                    <div className="achievement-content">
                        <h4 className={`achievement-title ${achievement.unlocked ? 'unlocked-title' : ''}`}>
                          {titleText}
                        </h4>
                        <p className="achievement-description">{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className={`rarity-badge rarity-${achievement.rarity}`}>
                            {achievement.rarity}
                          </span>
                          {achievement.progress !== undefined && (
                            <div className="progress-container">
                              <div className="progress-bar">
                                <motion.div
                                  className={`progress-fill ${achievement.unlocked ? 'completed' : ''}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${achievement.progress}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                                ></motion.div>
                              </div>
                              <span className="progress-text">
                                {achievement.unlocked ? '✓ Complete' : `${Math.round(achievement.progress)}%`}
                              </span>
                            </div>
                          )}
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Achievement Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            className="achievement-notification"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="notification-content">
              <h4>{showNotification.title}</h4>
              <p>{showNotification.description}</p>
            </div>
            <div
              className="notification-close"
              onClick={() => setShowNotification(null)}
              role="button"
              aria-label="Close achievement notification"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowNotification(null);
                }
              }}
            >×</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        autoClose={notification.autoClose}
      />
    </div>
  );
};

export default AchievementSystem;
