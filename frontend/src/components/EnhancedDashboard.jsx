import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import pwaManager from '../utils/pwaUtils'; // ✅ Import PWA utilities
import { useNetworkStatus } from '../hooks/useNetworkStatus'; // ✅ Network status
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import axios from '../utils/axios';
import './EnhancedDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const EnhancedDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    currentStreak: 0,
    weeklyProgress: [],
    categoryPerformance: {},
    recentAchievements: []
  });

  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ PWA State Management
  const isOnline = useNetworkStatus();
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    // Check immediately on component mount
    const immediate = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true ||
                     window.matchMedia('(display-mode: fullscreen)').matches;
    return immediate;
  });
  const [isInstallable, setIsInstallable] = useState(false);

  // ✅ Check PWA installation status
  useEffect(() => {
    const checkPWAStatus = () => {
      const pwaInfo = pwaManager.getInstallationInfo();
      console.log('📱 PWA Status Check:', pwaInfo);
      
      setIsInstalled(pwaInfo.isInstalled);
      setCanInstall(pwaInfo.canInstall);
      setIsInstallable(pwaInfo.isInstallable);
      
      console.log('Dashboard PWA State:', {
        isInstalled: pwaInfo.isInstalled,
        canInstall: pwaInfo.canInstall,
        isInstallable: pwaInfo.isInstallable,
        hasPrompt: pwaInfo.hasPrompt,
        displayMode: pwaInfo.displayMode
      });

      // Additional standalone detection logging
      console.log('🔍 Standalone Detection:', {
        mediaQuery: window.matchMedia('(display-mode: standalone)').matches,
        navigatorStandalone: window.navigator.standalone,
        fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
        windowDimensions: {
          outer: { width: window.outerWidth, height: window.outerHeight },
          inner: { width: window.innerWidth, height: window.innerHeight }
        }
      });
    };
    
    checkPWAStatus();
    
    // Listen for PWA events
    const handlePWAInstallable = () => {
      console.log('🎯 PWA installable event received');
      checkPWAStatus();
    };
    
    const handlePWAInstalled = () => {
      console.log('🎉 PWA installed event received');
      checkPWAStatus();
    };
    
    window.addEventListener('pwa-installable', handlePWAInstallable);
    window.addEventListener('pwa-installed', handlePWAInstalled);
    
    // Check periodically for changes (less frequent when installed)
    const initialPWAInfo = pwaManager.getInstallationInfo();
    const checkInterval = initialPWAInfo.isInstalled ? 30000 : 5000; // 30s if installed, 5s if not
    const interval = setInterval(checkPWAStatus, checkInterval);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('pwa-installable', handlePWAInstallable);
      window.removeEventListener('pwa-installed', handlePWAInstalled);
    };
  }, []);

  // ✅ PWA Install Handler
  const handlePWAInstall = async () => {
    console.log('🚀 PWA Install button clicked');
    console.log('Current PWA state:', { 
      canInstall, 
      isInstalled, 
      isInstallable,
      hasPrompt: !!pwaManager.installPrompt 
    });
    
    try {
      const success = await pwaManager.promptInstall();
      console.log('📱 PWA Install result:', success);
      
      if (success) {
        console.log('🎉 PWA installation initiated successfully!');
        
        // Update state immediately
        setCanInstall(false);
        setIsInstallable(false);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #48bb78, #38a169);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-weight: 600;
          box-shadow: 0 8px 32px rgba(72, 187, 120, 0.3);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = '🎉 QuizNest installation started!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 3000);
      } else {
        console.log('📱 PWA installation was cancelled or showing manual instructions');
        
        // Show helpful message for manual installation
        const helpNotification = document.createElement('div');
        helpNotification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-weight: 600;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
          z-index: 10000;
          max-width: 300px;
          animation: slideIn 0.3s ease-out;
        `;
        helpNotification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span>📱</span>
            <strong>Manual Installation Available</strong>
          </div>
          <div style="font-size: 14px; opacity: 0.9;">
            Look for the install icon in your address bar or browser menu!
          </div>
        `;
        document.body.appendChild(helpNotification);
        
        setTimeout(() => {
          if (helpNotification.parentNode) {
            helpNotification.remove();
          }
        }, 5000);
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
    }
  };

  // Fetch real data from API
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user data from localStorage or context
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id;
      
      if (!userId) {
        throw new Error('User not found. Please log in again.');
      }

      const response = await axios.get(`/api/dashboard/${userId}?timeRange=${timeRange}`);
      
      if (response.data && response.status === 200) {
        // Process and validate the data
        const processedData = {
          totalQuizzes: response.data.totalQuizzes || 0,
          completedQuizzes: response.data.completedQuizzes || 0,
          averageScore: parseFloat(response.data.averageScore || 0).toFixed(1),
          currentStreak: response.data.currentStreak || 0,
          weeklyProgress: response.data.weeklyProgress || [],
          categoryPerformance: response.data.categoryPerformance || {},
          recentAchievements: response.data.recentAchievements || []
        };

        setDashboardData(processedData);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.message || error.message);
      
      // Fallback to mock data with better structure
      const fallbackData = {
        totalQuizzes: 13,
        completedQuizzes: 8,
        averageScore: '78.5',
        currentStreak: 0,
        weeklyProgress: [65, 72, 68, 85, 91, 78, 82],
        categoryPerformance: {
          'Science': 85,
          'Mathematics': 91,
          'History': 72,
          'Literature': 68,
          'Geography': 78,
          'Programming': 88,
          'General': 76
        },
        recentAchievements: [
          { 
            id: 1, 
            title: '🔥 First Steps', 
            description: 'Completed your first quiz successfully',
            rarity: 'common'
          },
          { 
            id: 2, 
            title: '📚 Learning Journey', 
            description: 'Completed 5 quizzes in different categories',
            rarity: 'rare'
          },
          { 
            id: 3, 
            title: '🎯 Consistent Learner', 
            description: 'Maintained good performance across quizzes',
            rarity: 'epic'
          }
        ]
      };

      setDashboardData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-color)',
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 35, 50, 0.95)',
        titleColor: 'var(--text-color)',
        bodyColor: 'var(--text-color)',
        borderColor: 'var(--accent)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'var(--text-color)',
          font: {
            size: 11
          },
          callback: function(value) {
            return value + '%';
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'var(--text-color)',
          font: {
            size: 11
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--text-color)',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 35, 50, 0.95)',
        titleColor: 'var(--text-color)',
        bodyColor: 'var(--text-color)',
        borderColor: 'var(--accent)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const categoryName = context.label;
            const icon = getCategoryIcon(categoryName);
            return icon + ' ' + categoryName + ': ' + context.parsed + '%';
          }
        }
      }
    },
    cutout: '50%'
  };

  const progressData = {
    labels: timeRange === 'week' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : dashboardData.weeklyProgress.map((_, index) => {
          if (timeRange === 'month') {
            return `Day ${index + 1}`;
          } else {
            return `Week ${index + 1}`;
          }
        }),
    datasets: [
      {
        label: 'Quiz Scores (%)',
        data: dashboardData.weeklyProgress.length > 0 
          ? dashboardData.weeklyProgress 
          : [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Function to get category icon
  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Science': '🔬',
      'Mathematics': '🧮',
      'History': '📜',
      'Literature': '📚',
      'Geography': '🌍',
      'Programming': '💻',
      'Sports': '⚽',
      'Entertainment': '🎬',
      'Art': '🎨',
      'Food & Cooking': '🍳',
      'Nature': '🌿',
      'Business': '💼',
      'Health & Medicine': '⚕️',
      'General': '📋'
    };
    return icons[categoryName] || '📚';
  };

  // Function to generate dynamic colors for categories
  const generateCategoryColors = (categoryCount) => {
    const baseColors = [
      'rgba(99, 102, 241, 0.8)',   // Blue
      'rgba(139, 92, 246, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(59, 130, 246, 0.8)',   // Light Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(245, 158, 11, 0.8)',   // Orange
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(34, 197, 94, 0.8)',    // Emerald
      'rgba(168, 85, 247, 0.8)',   // Violet
      'rgba(14, 165, 233, 0.8)',   // Sky
      'rgba(251, 146, 60, 0.8)',   // Amber
      'rgba(156, 163, 175, 0.8)',  // Gray
    ];
    
    const borderColors = [
      'rgb(99, 102, 241)',   // Blue
      'rgb(139, 92, 246)',   // Purple
      'rgb(236, 72, 153)',   // Pink
      'rgb(59, 130, 246)',   // Light Blue
      'rgb(16, 185, 129)',   // Green
      'rgb(245, 158, 11)',   // Orange
      'rgb(239, 68, 68)',    // Red
      'rgb(34, 197, 94)',    // Emerald
      'rgb(168, 85, 247)',   // Violet
      'rgb(14, 165, 233)',   // Sky
      'rgb(251, 146, 60)',   // Amber
      'rgb(156, 163, 175)',  // Gray
    ];
    
    return {
      backgroundColor: baseColors.slice(0, categoryCount),
      borderColor: borderColors.slice(0, categoryCount)
    };
  };

  const categoryKeys = Object.keys(dashboardData.categoryPerformance);
  const categoryCount = categoryKeys.length || 5;
  const categoryColors = generateCategoryColors(categoryCount);

  const categoryData = {
    labels: categoryKeys.length > 0 
      ? categoryKeys
      : ['General', 'Science', 'Mathematics', 'History', 'Literature'],
    datasets: [
      {
        data: categoryKeys.length > 0
          ? Object.values(dashboardData.categoryPerformance)
          : [0, 0, 0, 0, 0],
        backgroundColor: categoryColors.backgroundColor,
        borderColor: categoryColors.borderColor,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  // Loading state
  if (loading) {
    return (
      <div className="enhanced-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-dashboard">
      {error && (
        <div className="dashboard-error-banner">
          <p>⚠️ {error} - Showing cached data</p>
        </div>
      )}
      
      <motion.div 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>📊 Premium Dashboard <span className="premium-badge">✨</span></h1>
        <div className="time-selector">
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              className={`time-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="dashboard-grid">
        {/* Quick Stats */}
        <motion.div 
          className="stats-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{dashboardData.totalQuizzes}</h3>
              <p>Total Quizzes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{dashboardData.completedQuizzes}</h3>
              <p>Completed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>{dashboardData.averageScore}%</h3>
              <p>Average Score</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3>{dashboardData.currentStreak}</h3>
              <p>Day Streak</p>
            </div>
          </div>
        </motion.div>

        {/* Progress Chart */}
        <motion.div 
          className="chart-card progress-chart"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>📈 Weekly Progress</h3>
          <div className="chart-container">
            <Line data={progressData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Category Performance */}
        <motion.div 
          className="chart-card category-chart"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3>📊 Subject Performance ({categoryCount} categories)</h3>
          <div className="chart-container">
            <Doughnut data={categoryData} options={doughnutOptions} />
          </div>
        </motion.div>

        {/* Recent Achievements */}
        <motion.div 
          className="achievements-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3>🏆 Recent Achievements</h3>
          <div className="achievements-list">
            {dashboardData.recentAchievements && dashboardData.recentAchievements.length > 0 ? (
              dashboardData.recentAchievements.map((achievement, index) => (
                <div key={achievement.id || index} className="achievement-item">
                  <div className="achievement-icon">
                    {achievement.title ? achievement.title.split(' ')[0] : '🏆'}
                  </div>
                  <div className="achievement-content">
                    <h4>{achievement.title ? achievement.title.substring(2) : 'Achievement'}</h4>
                    <p>{achievement.description || 'Keep up the great work!'}</p>
                  </div>
                  {achievement.rarity && (
                    <div className={`achievement-rarity ${achievement.rarity}`}>
                      {achievement.rarity.toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-achievements">
                <div className="no-achievements-icon">🎯</div>
                <p>Complete more quizzes to unlock achievements!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Study Recommendations */}
        <motion.div 
          className="recommendations-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3>💡 Study Recommendations</h3>
          <div className="recommendations-list">
            {/* Dynamic recommendations based on data */}
            {dashboardData.averageScore < 70 && (
              <div className="recommendation-item">
                <span className="rec-icon">📚</span>
                <div>
                  <h4>Practice More</h4>
                  <p>Your average score is {dashboardData.averageScore}% - keep practicing to improve!</p>
                </div>
              </div>
            )}
            
            {dashboardData.currentStreak === 0 && (
              <div className="recommendation-item">
                <span className="rec-icon">🔥</span>
                <div>
                  <h4>Start a Streak</h4>
                  <p>Take a quiz today to start building your learning streak!</p>
                </div>
              </div>
            )}
            
            {dashboardData.currentStreak > 0 && (
              <div className="recommendation-item">
                <span className="rec-icon">⏰</span>
                <div>
                  <h4>Keep your streak!</h4>
                  <p>You have a {dashboardData.currentStreak}-day streak - don't break it!</p>
                </div>
              </div>
            )}
            
            {(() => {
              // Find weakest category
              const categories = dashboardData.categoryPerformance;
              const categoryEntries = Object.entries(categories);
              if (categoryEntries.length > 0) {
                const weakestCategory = categoryEntries.reduce((min, curr) => 
                  curr[1] < min[1] ? curr : min
                );
                return (
                  <div className="recommendation-item">
                    <span className="rec-icon">{getCategoryIcon(weakestCategory[0])}</span>
                    <div>
                      <h4>Focus on {weakestCategory[0]}</h4>
                      <p>Your score in {weakestCategory[0]} is {weakestCategory[1]}% - try more quizzes in this category</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="recommendation-item">
                  <span className="rec-icon">🌟</span>
                  <div>
                    <h4>Explore Categories</h4>
                    <p>Try quizzes in different categories to discover your strengths</p>
                  </div>
                </div>
              );
            })()}
            
            {dashboardData.completedQuizzes < 5 && (
              <div className="recommendation-item">
                <span className="rec-icon">🚀</span>
                <div>
                  <h4>Get Started</h4>
                  <p>Complete more quizzes to unlock detailed analytics and achievements</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Next-Gen Features Showcase */}
        <motion.div 
          className="features-showcase-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h3>🚀 Next-Gen Features</h3>
          <div className="features-grid">
            <motion.div 
              className="feature-card ai-feature"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/ai-study-buddy'}
            >
              <div className="feature-icon">🤖</div>
              <div className="feature-content">
                <h4>AI Study Buddy</h4>
                <p>Your personal AI tutor that creates quizzes, explains concepts, and tracks your progress</p>
                <div className="feature-tags">
                  <span className="feature-tag">Personalized</span>
                  <span className="feature-tag">Smart</span>
                </div>
              </div>
              <div className="feature-arrow">→</div>
            </motion.div>

            <motion.div 
              className="feature-card realtime-feature"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/real-time-quiz'}
            >
              <div className="feature-icon">⚡</div>
              <div className="feature-content">
                <h4>Real-Time Quiz Battles</h4>
                <p>Challenge friends and players worldwide in live multiplayer quiz competitions</p>
                <div className="feature-tags">
                  <span className="feature-tag">Multiplayer</span>
                  <span className="feature-tag">Live</span>
                </div>
              </div>
              <div className="feature-arrow">→</div>
            </motion.div>

            <motion.div 
              className="feature-card social-feature"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/friends'}
            >
              <div className="feature-icon">🤝</div>
              <div className="feature-content">
                <h4>Social Learning</h4>
                <p>Connect with friends, join study groups, and learn together</p>
                <div className="feature-tags">
                  <span className="feature-tag">Friends</span>
                  <span className="feature-tag">Groups</span>
                </div>
              </div>
              <div className="feature-arrow">→</div>
            </motion.div>

            <motion.div 
              className="feature-card gamification-feature"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/gamification'}
            >
              <div className="feature-icon">🎮</div>
              <div className="feature-content">
                <h4>Gamification Hub</h4>
                <p>Earn XP, unlock achievements, compete in tournaments and daily challenges</p>
                <div className="feature-tags">
                  <span className="feature-tag">XP System</span>
                  <span className="feature-tag">Tournaments</span>
                </div>
              </div>
              <div className="feature-arrow">→</div>
            </motion.div>
          </div>

          {/* Connection Status Indicator - Only show in browser mode */}
          {!isInstalled && (
            <motion.div 
              className={`connection-status ${isOnline ? 'online' : 'offline'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="status-indicator">
                <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
                <span className="status-text">
                  {isOnline ? '🌐 Online' : '📱 Offline Mode'} 
                  {!isOnline && ' - Cached content available'}
                </span>
              </div>
            </motion.div>
          )}

          {/* PWA Installed Status - Show when app is installed */}
          {isInstalled && (
            <motion.div 
              className="pwa-installed-status"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="installed-content">
                <div className="installed-icon">✅</div>
                <div className="installed-text">
                  <h4>App Installed</h4>
                  <p>QuizNest is running as an installed app! Enjoy the full experience.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* PWA Installation Banner - Only show when not installed */}
          {!isInstalled && (
            <motion.div 
              className="pwa-install-banner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="pwa-content">
                <div className="pwa-icon">📱</div>
                <div className="pwa-text">
                  <h4>Install QuizNest App</h4>
                  <p>{canInstall 
                    ? (pwaManager.installPrompt ? 'Ready to install! Click below for native installation.' : 'App is installable! Click below to install.')
                    : 'All requirements met! Click below for installation instructions.'
                  }</p>
                </div>
              </div>
              <motion.button 
                className="pwa-install-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePWAInstall}
                disabled={isInstalled}
                style={{ 
                  cursor: isInstalled ? 'not-allowed' : 'pointer'
                }}
              >
                {canInstall ? '📱 Install App' : '📋 Show Install Guide'}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
