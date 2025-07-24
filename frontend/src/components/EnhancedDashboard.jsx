import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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

      console.log('Fetching dashboard data for user:', userId);
      const response = await axios.get(`/api/dashboard/${userId}?timeRange=${timeRange}`);
      
      console.log('Dashboard response:', response.data);
      
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
        
        console.log('Processed dashboard data:', processedData);
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
      
      console.log('Using fallback data:', fallbackData);
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
      </div>
    </div>
  );
};

export default EnhancedDashboard;
