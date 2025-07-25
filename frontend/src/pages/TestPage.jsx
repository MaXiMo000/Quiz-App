import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './TestPage.css';

const TestPage = () => {
  return (
    <div className="test-page">
      <motion.div 
        className="test-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>🧪 Test New Features</h1>
        <p>Click on any feature below to test the new components</p>
      </motion.div>

      <div className="test-grid">
        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/enhanced-dashboard" className="test-link">
            <div className="test-icon">📊</div>
            <h3>Enhanced Dashboard</h3>
            <p>Interactive charts, progress tracking, and beautiful analytics</p>
            <span className="test-status new">NEW</span>
          </Link>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/achievements" className="test-link">
            <div className="test-icon">🏆</div>
            <h3>Achievement System</h3>
            <p>Unlock badges, track progress, and celebrate milestones</p>
            <span className="test-status new">NEW</span>
          </Link>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/intelligence-dashboard" className="test-link">
            <div className="test-icon">🧠</div>
            <h3>Intelligence Dashboard</h3>
            <p>AI-powered insights, smart recommendations, and learning analytics</p>
            <span className="test-status new">NEW</span>
            <div className="test-note">Premium Feature</div>
          </Link>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="test-link">
            <div className="test-icon">🎨</div>
            <h3>Advanced Theme Selector</h3>
            <p>Live preview themes with categories and search</p>
            <span className="test-status new">NEW</span>
            <div className="test-note">Available on Home page</div>
          </div>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/themes" className="test-link">
            <div className="test-icon">🌈</div>
            <h3>Original Theme Page</h3>
            <p>Your existing theme selector page</p>
            <span className="test-status existing">EXISTING</span>
          </Link>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/analytics" className="test-link">
            <div className="test-icon">📈</div>
            <h3>User Analytics</h3>
            <p>Your existing analytics dashboard</p>
            <span className="test-status existing">EXISTING</span>
          </Link>
        </motion.div>

        <motion.div 
          className="test-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link to="/" className="test-link">
            <div className="test-icon">🏠</div>
            <h3>Home Dashboard</h3>
            <p>Your beautiful existing home page with new theme selector</p>
            <span className="test-status enhanced">ENHANCED</span>
          </Link>
        </motion.div>
      </div>

      <motion.div 
        className="test-info"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <h2>🎯 What's New?</h2>
        <ul>
          <li><strong>Intelligence Dashboard:</strong> AI-powered insights with smart recommendations and learning analytics (Premium)</li>
          <li><strong>Enhanced Dashboard:</strong> Beautiful data visualizations with Chart.js</li>
          <li><strong>Achievement System:</strong> Gamified learning with unlockable badges</li>
          <li><strong>Advanced Theme Selector:</strong> Live preview with categories and search</li>
          <li><strong>Improved Navigation:</strong> Added links to sidebar for easy access</li>
          <li><strong>Better UX:</strong> Smooth animations and modern design patterns</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default TestPage;
