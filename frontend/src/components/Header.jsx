import React, { useState } from 'react';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userStats] = useState({
    streak: 7,
    weight: 185,
    goal: 'Muscle Gain',
    level: 12
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="streak-badge">
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{userStats.streak} days</span>
          </div>
          
          <div className="user-level">
            <span className="level-label">Level {userStats.level}</span>
            <div className="level-progress">
              <div className="level-fill" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="header-center">
          <h1 className="app-title">FitTrack Pro</h1>
          <p className="app-subtitle">Track Your Gym Progression</p>
        </div>
        
        <div className="header-right">
          <button className="header-btn quick-actions" aria-label="Quick Actions">
            <span className="btn-icon">⚡</span>
            <span className="btn-text">Quick Start</span>
          </button>
          
          <button 
            className="mobile-menu-btn" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
          
          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-value">{userStats.weight} lbs</span>
              <span className="stat-label">Current Weight</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">{userStats.goal}</span>
              <span className="stat-label">Goal</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-stats">
          <div className="mobile-stat">
            <span className="mobile-stat-icon">🔥</span>
            <div className="mobile-stat-info">
              <span className="mobile-stat-value">{userStats.streak} days</span>
              <span className="mobile-stat-label">Current Streak</span>
            </div>
          </div>
          <div className="mobile-stat">
            <span className="mobile-stat-icon">🏋️</span>
            <div className="mobile-stat-info">
              <span className="mobile-stat-value">{userStats.weight} lbs</span>
              <span className="mobile-stat-label">Weight</span>
            </div>
          </div>
          <div className="mobile-stat">
            <span className="mobile-stat-icon">🎯</span>
            <div className="mobile-stat-info">
              <span className="mobile-stat-value">{userStats.goal}</span>
              <span className="mobile-stat-label">Goal</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;