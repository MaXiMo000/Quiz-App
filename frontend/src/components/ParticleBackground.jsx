// src/components/ParticleBackground.jsx - Enhanced Theme-Responsive Particles
import React, { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import './ParticleBackground.css';

const ParticleBackground = () => {
  const { theme } = useContext(ThemeContext);
  const [particles, setParticles] = useState([]);
  const [key, setKey] = useState(0); // Force re-render on theme change

  // Generate particles based on theme
  useEffect(() => {
    console.log('Current theme in ParticleBackground:', theme); // Debug log
    let particleCount = 35;
    let baseOpacity = [0.1, 0.3, 0.1];
    let animationProps = {};
    let colors = {}; // Define colors directly for each theme

    // Theme-specific particle configurations
    switch(theme) {
      case 'Light':
        particleCount = 20; // Fewer particles for cleaner look
        baseOpacity = [0.02, 0.08, 0.02];
        colors = {
          primary: '#2563eb',
          secondary: '#7c3aed', 
          success: '#059669',
          info: '#0284c7',
          warning: '#d97706'
        };
        animationProps = {
          duration: { min: 25, max: 40 },
          movement: { x: 15, y: 50 }
        };
        break;
      
      case 'Ocean':
        particleCount = 45;
        baseOpacity = [0.2, 0.6, 0.2];
        colors = {
          primary: '#ffd700',
          secondary: '#ff8c42',
          success: '#40e0d0',
          info: '#87ceeb',
          warning: '#ffa500'
        };
        animationProps = {
          duration: { min: 15, max: 25 },
          movement: { x: 40, y: 80 }
        };
        break;
      
      case 'Forest':
        particleCount = 40;
        baseOpacity = [0.15, 0.4, 0.15];
        colors = {
          primary: '#4ade80',
          secondary: '#22c55e',
          success: '#10b981',
          info: '#06b6d4',
          warning: '#fbbf24'
        };
        animationProps = {
          duration: { min: 18, max: 30 },
          movement: { x: 30, y: 70 }
        };
        break;
      
      case 'Sunset':
        particleCount = 35;
        baseOpacity = [0.1, 0.35, 0.1];
        colors = {
          primary: '#f97316',
          secondary: '#ea580c',
          success: '#059669',
          info: '#0891b2',
          warning: '#d97706'
        };
        animationProps = {
          duration: { min: 16, max: 28 },
          movement: { x: 35, y: 75 }
        };
        break;
      
      case 'Lavender':
        particleCount = 30;
        baseOpacity = [0.08, 0.25, 0.08];
        colors = {
          primary: '#8b5cf6',
          secondary: '#a855f7',
          success: '#059669',
          info: '#0891b2',
          warning: '#d97706'
        };
        animationProps = {
          duration: { min: 22, max: 38 },
          movement: { x: 25, y: 65 }
        };
        break;
      
      case 'synthwave':
        particleCount = 50;
        baseOpacity = [0.3, 0.8, 0.3];
        colors = {
          primary: '#00d9ff',
          secondary: '#ff0095',
          success: '#39ff14',
          info: '#ff5fd7',
          warning: '#ffb347'
        };
        animationProps = {
          duration: { min: 12, max: 20 },
          movement: { x: 50, y: 90 },
          special: 'glow'
        };
        break;
      
      case 'tokyo-night':
        particleCount = 38;
        baseOpacity = [0.15, 0.45, 0.15];
        colors = {
          primary: '#7aa2f7',
          secondary: '#bb9af7',
          success: '#9ece6a',
          info: '#7dcfff',
          warning: '#e0af68'
        };
        animationProps = {
          duration: { min: 17, max: 27 },
          movement: { x: 32, y: 72 }
        };
        break;
      
      case 'gruvbox-dark':
        particleCount = 35;
        baseOpacity = [0.12, 0.4, 0.12];
        colors = {
          primary: '#b8bb26',
          secondary: '#fabd2f',
          success: '#98971a',
          info: '#458588',
          warning: '#d79921'
        };
        animationProps = {
          duration: { min: 19, max: 32 },
          movement: { x: 28, y: 68 }
        };
        break;
      
      case 'material-dark':
        particleCount = 32;
        baseOpacity = [0.1, 0.35, 0.1];
        colors = {
          primary: '#bb86fc',
          secondary: '#03dac6',
          success: '#4caf50',
          info: '#2196f3',
          warning: '#ff9800'
        };
        animationProps = {
          duration: { min: 20, max: 35 },
          movement: { x: 26, y: 66 }
        };
        break;
      
      case 'nord':
        particleCount = 30;
        baseOpacity = [0.08, 0.3, 0.08];
        colors = {
          primary: '#81a1c1',
          secondary: '#88c0d0',
          success: '#a3be8c',
          info: '#5e81ac',
          warning: '#ebcb8b'
        };
        animationProps = {
          duration: { min: 24, max: 40 },
          movement: { x: 22, y: 62 }
        };
        break;
      
      case 'Dark':
        particleCount = 35;
        baseOpacity = [0.1, 0.3, 0.1];
        colors = {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          success: '#22c55e',
          info: '#06b6d4',
          warning: '#eab308'
        };
        animationProps = {
          duration: { min: 18, max: 30 },
          movement: { x: 30, y: 75 }
        };
        break;
      
      case 'Default':
        particleCount = 25;
        baseOpacity = [0.05, 0.15, 0.05];
        colors = {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          success: '#10b981',
          info: '#06b6d4',
          warning: '#f59e0b'
        };
        animationProps = {
          duration: { min: 20, max: 30 },
          movement: { x: 25, y: 70 }
        };
        break;
      
      default:
        particleCount = 35;
        baseOpacity = [0.05, 0.15, 0.05];
        colors = {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          success: '#10b981',
          info: '#06b6d4',
          warning: '#f59e0b'
        };
        animationProps = {
          duration: { min: 15, max: 25 },
          movement: { x: 30, y: 80 }
        };
    }

    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * (animationProps.duration.max - animationProps.duration.min) + animationProps.duration.min,
      opacity: baseOpacity,
      movement: animationProps.movement,
      special: animationProps.special || null,
      colors: colors
    }));

    setParticles(newParticles);
    setKey(prev => prev + 1); // Force re-render
  }, [theme]);

  return (
    <div className="particle-background" key={key}>
      {particles.map((particle) => {
        // Select color based on particle index
        let particleColor = particle.colors.primary;
        if (particle.id % 5 === 0) particleColor = particle.colors.warning;
        else if (particle.id % 3 === 0) particleColor = particle.colors.success;
        else if (particle.id % 2 === 0) particleColor = particle.colors.secondary;
        else if (particle.id % 7 === 0) particleColor = particle.colors.info;

        return (
          <motion.div
            key={`${particle.id}-${key}`}
            className="particle"
            style={{
              left: `${particle.initialX}%`,
              top: `${particle.initialY}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particleColor,
              boxShadow: `0 0 ${particle.size * 2}px ${particleColor}`,
            }}
            animate={{
              y: [0, -particle.movement.y, 0],
              x: [0, Math.random() * particle.movement.x - particle.movement.x/2, 0],
              opacity: particle.opacity,
              ...(particle.special === 'glow' && {
                scale: [1, 1.3, 1],
                filter: ['blur(1px)', 'blur(0.5px)', 'blur(1px)']
              })
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              ...(particle.special === 'glow' && {
                scale: { duration: particle.duration * 0.7 },
                filter: { duration: particle.duration * 0.5 }
              })
            }}
          />
        );
      })}
    </div>
  );
};

export default ParticleBackground;
