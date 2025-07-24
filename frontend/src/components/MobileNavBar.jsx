// Enhanced Mobile Navigation Bar Component
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useResponsive from '../hooks/useResponsive';
import './MobileNavBar.css';

const MobileNavBar = ({ onMenuClick }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const { isMobile, breakpoints } = useResponsive();
  const location = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/admin') {
      setActiveTab('home');
    } else if (path.includes('/user/test') || path.includes('/admin/create')) {
      setActiveTab('quiz');
    } else if (path.includes('/achievements')) {
      setActiveTab('achievements');
    } else if (path.includes('/leaderboard') || path.includes('/xp-leaderboard')) {
      setActiveTab('leaderboard');
    } else if (path.includes('/user/report') || path.includes('/admin/report')) {
      setActiveTab('reports');
    } else {
      setActiveTab('more');
    }
  }, [location]);

  // Don't render on desktop
  if (!isMobile && !breakpoints.mobile) {
    return null;
  }

  const getNavigationItems = () => {
    const commonItems = [
      {
        id: 'home',
        icon: '🏠',
        label: 'Home',
        path: user?.role === 'admin' ? '/admin' : '/',
        color: '#6366f1'
      },
      {
        id: 'quiz',
        icon: '📚',
        label: 'Quizzes',
        path: user?.role === 'admin' ? '/admin/create' : '/user/test',
        color: '#10b981'
      }
    ];

    if (user?.role === 'admin') {
      return [
        ...commonItems,
        {
          id: 'reports',
          icon: '📊',
          label: 'Reports',
          path: '/admin/report',
          color: '#f59e0b'
        },
        {
          id: 'leaderboard',
          icon: '🏆',
          label: 'Leaders',
          path: '/leaderboard',
          color: '#ef4444'
        }
      ];
    } else {
      return [
        ...commonItems,
        {
          id: 'achievements',
          icon: '🏆',
          label: 'Rewards',
          path: '/achievements',
          color: '#f59e0b'
        },
        {
          id: 'reports',
          icon: '📈',
          label: 'Progress',
          path: '/user/report',
          color: '#8b5cf6'
        }
      ];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <motion.div 
      className="mobile-nav-bar"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
    >
      <div className="nav-container">
        {/* Menu Button */}
        <button
          className="nav-item menu-button"
          onClick={onMenuClick}
        >
          <motion.div
            className="nav-icon-container"
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <span className="nav-icon" style={{ color: '#64748b' }}>
              ☰
            </span>
          </motion.div>
          <span className="nav-label" style={{ color: '#64748b' }}>
            Menu
          </span>
        </button>

        {navigationItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <motion.div
              className="nav-icon-container"
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <span className="nav-icon" style={{ color: activeTab === item.id ? item.color : '#64748b' }}>
                {item.icon}
              </span>
              {activeTab === item.id && (
                <motion.div
                  className="active-indicator"
                  layoutId="activeIndicator"
                  style={{ backgroundColor: item.color }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
            <span 
              className={`nav-label ${activeTab === item.id ? 'active' : ''}`}
              style={{ color: activeTab === item.id ? item.color : '#64748b' }}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
};

export default MobileNavBar;
