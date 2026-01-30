import React from 'react';
import './Navigation.css';

const Navigation = ({ page, setPage }) => {
  const pages = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'exercises', label: 'Exercises', icon: '🏋️' },
    { id: 'log', label: 'Log Workout', icon: '📝' },
    { id: 'workouts', label: 'Feed', icon: '📱' },
    { id: 'calories', label: 'Calories', icon: '🔥' },
    { id: 'food', label: 'Food Info', icon: '🍎' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <div className="logo-icon">💪</div>
          <div className="logo-text">
            <span className="logo-title">FitTrack</span>
            <span className="logo-subtitle">Gym Progression</span>
          </div>
        </div>
        
        <div className="nav-links">
          {pages.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
              aria-label={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {page === item.id && <div className="active-indicator"></div>}
            </button>
          ))}
        </div>
        
        <div className="nav-progress">
          <div className="progress-info">
            <span className="progress-label">Weekly Goal</span>
            <span className="progress-value">3/5 workouts</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;