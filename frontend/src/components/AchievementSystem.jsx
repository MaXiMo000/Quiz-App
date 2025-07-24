import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import './AchievementSystem.css';

const AchievementSystem = ({ _userId }) => {
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotification, setShowNotification] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked

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
      console.error('Error fetching achievements:', error);
      setError(error.message);
      
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
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Loading state
  if (loading) {
    return (
      <div className="achievement-system">
        <div className="achievement-loading">
          <div className="loading-spinner"></div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  // Error state with fallback
  if (error) {
    return (
      <div className="achievement-system">
        <div className="achievement-error">
          <p>⚠️ {error}</p>
          <p>Showing cached achievements...</p>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Streaks': '🔥',
      'Learning Progress': '📚',
      'Performance': '🎯',
      'Subject Mastery': '🧠',
      'Levels': '⭐',
      'Time-Based': '⏰',
      'Special': '🏆'
    };
    return icons[categoryName] || '🏅';
  };

  const getRarityStyle = (rarity) => {
    const styles = {
      common: { 
        border: '2px solid #9ca3af',
        glow: '0 0 15px rgba(156, 163, 175, 0.3)'
      },
      rare: { 
        border: '2px solid #3b82f6',
        glow: '0 0 15px rgba(59, 130, 246, 0.4)'
      },
      epic: { 
        border: '2px solid #8b5cf6',
        glow: '0 0 15px rgba(139, 92, 246, 0.4)'
      },
      legendary: { 
        border: '2px solid #f59e0b',
        glow: '0 0 20px rgba(245, 158, 11, 0.6)'
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

  // Group achievements by category (enhanced with new categories)
  const achievementsByCategory = {
    'Streaks': filteredAchievements.filter(a => a.id.includes('streak')),
    'Learning Progress': filteredAchievements.filter(a => a.id.includes('quiz')),
    'Performance': filteredAchievements.filter(a => a.id.includes('score')),
    'Subject Mastery': filteredAchievements.filter(a => a.id.startsWith('category_')),
    'Levels': filteredAchievements.filter(a => a.id.includes('level')),
    'Time-Based': filteredAchievements.filter(a => a.id.includes('early_bird') || a.id.includes('night_owl')),
    'Special': filteredAchievements.filter(a => 
      !['streak', 'quiz', 'score', 'level', 'category_', 'early_bird', 'night_owl'].some(type => 
        a.id.includes(type) || a.id.startsWith(type)
      )
    )
  };

  return (
    <div className="achievement-system">
      <motion.div 
        className="achievement-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <h1>🏆 Achievement Center</h1>
          <div className="progress-overview">
            <div className="completion-circle">
              <svg width="60" height="60" className="progress-ring">
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 25}`}
                  strokeDashoffset={`${2 * Math.PI * 25 * (1 - getCompletionPercentage() / 100)}`}
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <span className="percentage-text">{getCompletionPercentage()}%</span>
            </div>
            <div className="progress-info">
              <p className="progress-main">{achievements.unlocked.length}/{allAchievements.length} Unlocked</p>
              <p className="progress-sub">Keep going to unlock more!</p>
            </div>
          </div>
        </div>

        <div className="filter-controls">
          {['all', 'unlocked', 'locked'].map(filterType => (
            <button
              key={filterType}
              className={`filter-btn ${filter === filterType ? 'active' : ''}`}
              onClick={() => setFilter(filterType)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="achievements-grid">
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
                {categoryAchievements.map((achievement) => {
                  const rarityStyle = getRarityStyle(achievement.rarity);
                  
                  return (
                    <motion.div
                      key={achievement.id}
                      className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                      style={{
                        border: rarityStyle.border,
                        boxShadow: achievement.unlocked ? rarityStyle.glow : 'none'
                      }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="achievement-icon">
                        {achievement.title.split(' ')[0]}
                      </div>
                      <div className="achievement-content">
                        <h4 className="achievement-title">
                          {achievement.title.substring(2)} {/* Remove emoji from title since it's in icon */}
                        </h4>
                        <p className="achievement-description">{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className={`rarity ${achievement.rarity}`}>{achievement.rarity}</span>
                          {!achievement.unlocked && achievement.progress !== undefined && (
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${achievement.progress}%` }}
                              ></div>
                              <span className="progress-text">{Math.round(achievement.progress)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {achievement.unlocked && (
                        <div className="unlock-badge">✓</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
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
            <div className="notification-close" onClick={() => setShowNotification(null)}>×</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementSystem;
