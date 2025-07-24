import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdvancedThemeSelector.css';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import { ThemeContext } from '../context/ThemeContext';

const AdvancedThemeSelector = () => {
  const { theme: currentTheme, changeTheme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { notification, showSuccess, hideNotification } = useNotification();

  const themes = {
    light: [
      { 
        name: 'Default', 
        category: 'standard',
        description: 'Modern dark theme with purple accents',
        preview: {
          bg: '#0a0e1a',
          accent: '#6366f1',
          text: '#e0e0e0',
          card: '#1a1b2e'
        }
      },
      { 
        name: 'Light', 
        category: 'standard',
        description: 'Clean light theme for daytime use',
        preview: {
          bg: '#ffffff',
          accent: '#2563eb',
          text: '#1f2937',
          card: '#f8fafc'
        }
      },
      { 
        name: 'ayu-light', 
        category: 'standard',
        description: 'Gentle pastels with orange highlights',
        preview: {
          bg: '#fafafa',
          accent: '#f97d58',
          text: '#333333',
          card: '#ffffff'
        }
      }
    ],
    dark: [
      { 
        name: 'dracula', 
        category: 'vibrant',
        description: 'Gothic dark theme with bright highlights',
        preview: {
          bg: '#282a36',
          accent: '#bd93f9',
          text: '#f8f8f2',
          card: '#44475a'
        }
      },
      { 
        name: 'tokyo-night', 
        category: 'modern',
        description: 'Moody indigos with neon green accents',
        preview: {
          bg: '#1a1b26',
          accent: '#7aa2f7',
          text: '#c0caf5',
          card: '#24283b'
        }
      },
      { 
        name: 'night-owl', 
        category: 'modern',
        description: 'Nighttime blues with bright colors',
        preview: {
          bg: '#011627',
          accent: '#82aaff',
          text: '#d6deeb',
          card: '#112240'
        }
      }
    ],
    nature: [
      { 
        name: 'Forest', 
        category: 'nature',
        description: 'Earthy greens inspired by deep forests',
        preview: {
          bg: '#0c1a0c',
          accent: '#4ade80',
          text: '#dcfce7',
          card: '#14532d'
        }
      },
      { 
        name: 'Ocean', 
        category: 'nature',
        description: 'Deep ocean blues with wave-like gradients',
        preview: {
          bg: '#0c1e2e',
          accent: '#38bdf8',
          text: '#e0f2fe',
          card: '#1e3a8a'
        }
      },
      { 
        name: 'Sunset', 
        category: 'nature',
        description: 'Warm sunset colors with golden hues',
        preview: {
          bg: '#fff8f0',
          accent: '#fb923c',
          text: '#431407',
          card: '#fed7aa'
        }
      }
    ],
    retro: [
      { 
        name: 'gruvbox-dark', 
        category: 'retro',
        description: 'Warm retro colors with vintage feel',
        preview: {
          bg: '#1d2021',
          accent: '#b8bb26',
          text: '#ebdbb2',
          card: '#3c3836'
        }
      },
      { 
        name: 'solarized-dark', 
        category: 'retro',
        description: 'Classic solarized dark theme',
        preview: {
          bg: '#002b36',
          accent: '#b58900',
          text: '#839496',
          card: '#073642'
        }
      },
      { 
        name: 'monokai', 
        category: 'retro',
        description: 'Classic monokai with sublime colors',
        preview: {
          bg: '#272822',
          accent: '#fd971f',
          text: '#f8f8f2',
          card: '#3e3d32'
        }
      }
    ]
  };

  const categories = [
    { id: 'all', name: 'All Themes', icon: '🎨' },
    { id: 'standard', name: 'Standard', icon: '💼' },
    { id: 'modern', name: 'Modern', icon: '🌙' },
    { id: 'nature', name: 'Nature', icon: '🌿' },
    { id: 'vibrant', name: 'Vibrant', icon: '🎆' },
    { id: 'retro', name: 'Retro', icon: '📼' }
  ];


  // Remove duplicate theme names (if any)
  const allThemes = [...themes.light, ...themes.dark, ...themes.nature, ...themes.retro].filter((theme, idx, arr) =>
    arr.findIndex(t => t.name === theme.name) === idx
  );

  const filteredThemes = allThemes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      theme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || theme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePreview = (theme) => {
    setPreviewTheme(theme);
    // Apply preview theme visually (but not persistently)
    if (theme && theme.name && theme.name !== currentTheme) {
      document.documentElement.setAttribute('data-theme', theme.name);
    }
  };

  const handleApplyTheme = (themeName) => {
    if (!themeName || typeof themeName !== 'string') return;
    changeTheme(themeName);
    setIsOpen(false);
    setPreviewTheme(null);
    showSuccess(`🎨 ${themeName} theme applied successfully!`);
  };

  const clearPreview = () => {
    setPreviewTheme(null);
    // Restore current theme when preview ends
    if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  };

  return (
    <>
      <motion.button
        className="theme-selector-trigger"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        🎨 Customize Theme
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="theme-selector-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsOpen(false);
              clearPreview();
            }}
          >
            <motion.div
              className="theme-selector-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>🎨 Choose Your Perfect Theme</h2>
                <button 
                  className="close-btn"
                  onClick={() => {
                    setIsOpen(false);
                    clearPreview();
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="theme-controls">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search themes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>

                <div className="category-tabs">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <span className="tab-icon">{category.icon}</span>
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="themes-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '2rem',
                width: '100%',
                margin: '0 auto',
                padding: '2rem 0',
                maxWidth: '900px'
              }}>
                {filteredThemes.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#888', gridColumn: '1/-1'}}>No themes found.</div>
                ) : (
                  filteredThemes.map((theme, index) => (
                    <motion.div
                      key={theme.name}
                      className={`theme-card ${currentTheme === theme.name ? 'current' : ''} ${previewTheme?.name === theme.name ? 'previewing' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onMouseEnter={() => handlePreview(theme)}
                      onMouseLeave={clearPreview}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `2px solid ${theme.preview.accent}`,
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        minHeight: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.08)'
                      }}
                    >
                      <div className="theme-preview" style={{
                        background: `linear-gradient(135deg, ${theme.preview.bg}, ${theme.preview.card})`,
                        border: `2px solid ${theme.preview.accent}`
                      }}>
                        <div className="preview-elements">
                          <div 
                            className="preview-accent" 
                            style={{ backgroundColor: theme.preview.accent }}
                          ></div>
                          <div 
                            className="preview-text"
                            style={{ color: theme.preview.text }}
                          >
                            Aa
                          </div>
                        </div>
                      </div>
                      <div className="theme-info">
                        <h3>{theme.name}</h3>
                        <p>{theme.description}</p>
                        <div className="theme-actions">
                          {currentTheme === theme.name ? (
                            <span className="current-badge">✨ Current</span>
                          ) : (
                            <button
                              className="apply-btn"
                              onClick={() => handleApplyTheme(theme.name)}
                              disabled={!theme.name}
                            >
                              Apply Theme
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {previewTheme && previewTheme.name !== currentTheme && (
                <div className="preview-notice">
                  <span className="preview-icon">👁️</span>
                  Previewing: <strong>{previewTheme.name}</strong>
                  <button 
                    className="apply-preview-btn"
                    onClick={() => {
                      handleApplyTheme(previewTheme.name);
                    }}
                  >
                    Apply This Theme
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationModal
        isOpen={notification.isOpen}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        autoClose={notification.autoClose}
      />
    </>
  );
};

export default AdvancedThemeSelector;
