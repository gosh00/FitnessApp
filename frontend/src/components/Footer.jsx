import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const quickLinks = [
    { label: 'Workout Plans', icon: '📋' },
    { label: 'Exercise Library', icon: '🏋️' },
    { label: 'Nutrition Guide', icon: '🥗' },
    { label: 'Progress Photos', icon: '📸' }
  ];
  
  const socialLinks = [
    { platform: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' },
    { platform: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
    { platform: 'Strava', icon: 'fab fa-strava', color: '#FC4C02' },
    { platform: 'Fitbit', icon: 'fab fa-fitbit', color: '#00B0B9' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon">💪</span>
              <div className="logo-text">
                <span className="logo-title">FitTrack</span>
                <span className="logo-subtitle">Progression Tracker</span>
              </div>
            </div>
            <p className="footer-description">
              Track your gym progress, monitor workouts, and achieve your fitness goals with our comprehensive tracking system.
            </p>
          </div>
          
          <div className="footer-links">
            <h3 className="links-title">Quick Access</h3>
            <div className="links-grid">
              {quickLinks.map((link, index) => (
                <a key={index} href="#!" className="quick-link">
                  <span className="link-icon">{link.icon}</span>
                  <span className="link-label">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
          
          <div className="footer-social">
            <h3 className="social-title">Connect With Us</h3>
            <div className="social-icons">
              {socialLinks.map((social, index) => (
                <a 
                  key={index} 
                  href="#!" 
                  className="social-link"
                  style={{ '--social-color': social.color }}
                  aria-label={social.platform}
                >
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
            <div className="app-badges">
              <button className="app-store-btn" aria-label="Download on App Store">
                <i className="fab fa-apple"></i>
                <span>App Store</span>
              </button>
              <button className="play-store-btn" aria-label="Get it on Google Play">
                <i className="fab fa-google-play"></i>
                <span>Google Play</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="workout-stats">
            <div className="stat">
              <span className="stat-number">5,281</span>
              <span className="stat-label">Workouts Logged</span>
            </div>
            <div className="stat">
              <span className="stat-number">892</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">1.2M</span>
              <span className="stat-label">Lbs Lifted</span>
            </div>
          </div>
          
          <div className="footer-info">
            <div className="copyright">
              &copy; {currentYear} FitTrack Pro. All rights reserved.
            </div>
            <div className="footer-legal">
              <a href="#!" className="legal-link">Privacy Policy</a>
              <a href="#!" className="legal-link">Terms of Service</a>
              <a href="#!" className="legal-link">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;