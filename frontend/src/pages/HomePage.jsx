import './HomePage.css';

const HomePage = () => {
  // Remove useState for stats since they don't need to be reactive
  const stats = {
    totalWorkouts: 42,
    caloriesBurned: 12500,
    personalRecords: 8,
    streakDays: 7,
    muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders']
  };

  // Define workouts directly instead of using useState with useEffect
  const workouts = [
    { id: 1, name: 'Chest & Triceps', date: 'Today', duration: '45 min', exercises: 8, calories: 420 },
    { id: 2, name: 'Leg Day', date: 'Yesterday', duration: '60 min', exercises: 10, calories: 580 },
    { id: 3, name: 'Back & Biceps', date: '2 days ago', duration: '50 min', exercises: 9, calories: 450 },
    { id: 4, name: 'Shoulders & Core', date: '3 days ago', duration: '40 min', exercises: 7, calories: 380 },
  ];

  // If you want to make them reactive later, use useState like this:
  // const [workouts, setWorkouts] = useState([...]);
  // const [stats, setStats] = useState({...});

  const fitnessTips = [
    "Stay hydrated - drink at least 3L of water daily",
    "Progressive overload is key for muscle growth",
    "Get 7-9 hours of sleep for optimal recovery",
    "Track your nutrition as closely as your workouts",
    "Don't skip warm-ups and cool-downs",
    "Focus on form over weight to prevent injuries"
  ];

  const upcomingChallenges = [
    { name: '30-Day Strength Challenge', daysLeft: 12, participants: 245 },
    { name: 'Summer Shred 2024', daysLeft: 45, participants: 892 },
    { name: 'Pull-up Progression', daysLeft: 30, participants: 156 }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome Back, Alex! 👋</h1>
          <p className="hero-subtitle">You're on a <span className="highlight">{stats.streakDays} day streak</span> - keep crushing it!</p>
          <div className="hero-stats">
            <div className="hero-stat-card">
              <span className="stat-number">{stats.totalWorkouts}</span>
              <span className="stat-label">Total Workouts</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">{stats.caloriesBurned.toLocaleString()}</span>
              <span className="stat-label">Calories Burned</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">{stats.personalRecords}</span>
              <span className="stat-label">Personal Records</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <div className="workout-graphic">
            <div className="dumbbell"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-card">
            <span className="action-icon">📝</span>
            <span className="action-title">Log Today's Workout</span>
            <span className="action-description">Record your exercises and sets</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">📊</span>
            <span className="action-title">View Progress</span>
            <span className="action-description">Check your strength gains</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">🍎</span>
            <span className="action-title">Log Meal</span>
            <span className="action-description">Track your nutrition</span>
          </button>
          <button className="quick-action-card">
            <span className="action-icon">🎯</span>
            <span className="action-title">Set New Goal</span>
            <span className="action-description">Define your next target</span>
          </button>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <div className="section-header">
          <h2 className="section-title">Recent Workouts</h2>
          <button className="view-all-btn">View All →</button>
        </div>
        
        <div className="workouts-grid">
          {workouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <div className="workout-header">
                <span className="workout-date">{workout.date}</span>
                <span className={`workout-status ${workout.date === 'Today' ? 'today' : ''}`}>
                  {workout.date === 'Today' ? 'In Progress' : 'Completed'}
                </span>
              </div>
              <h3 className="workout-name">{workout.name}</h3>
              <div className="workout-stats">
                <div className="workout-stat">
                  <span className="stat-icon">⏱️</span>
                  <span>{workout.duration}</span>
                </div>
                <div className="workout-stat">
                  <span className="stat-icon">🏋️</span>
                  <span>{workout.exercises} exercises</span>
                </div>
                <div className="workout-stat">
                  <span className="stat-icon">🔥</span>
                  <span>{workout.calories} cal</span>
                </div>
              </div>
              <button className="workout-details-btn">View Details</button>
            </div>
          ))}
        </div>
      </section>

      {/* Progress Overview */}
      <section className="progress-section">
        <h2 className="section-title">Your Progress This Month</h2>
        <div className="progress-grid">
          <div className="progress-card">
            <h3 className="progress-card-title">Strength Gains</h3>
            <div className="progress-bar-container">
              <div className="progress-bar-label">
                <span>Bench Press</span>
                <span>+15 lbs</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-label">
                <span>Squat</span>
                <span>+20 lbs</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '90%' }}></div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-label">
                <span>Deadlift</span>
                <span>+25 lbs</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="progress-card">
            <h3 className="progress-card-title">Muscle Groups Trained</h3>
            <div className="muscle-groups">
              {stats.muscleGroups.map((muscle, index) => (
                <div key={index} className="muscle-tag">
                  {muscle}
                </div>
              ))}
            </div>
            <div className="muscle-focus">
              <h4>This Week's Focus</h4>
              <div className="focus-area">
                <span className="focus-name">Upper Body</span>
                <span className="focus-sessions">3 sessions</span>
              </div>
            </div>
          </div>
          
          <div className="progress-card">
            <h3 className="progress-card-title">Weekly Target</h3>
            <div className="weekly-target">
              <div className="target-progress">
                <div className="target-circle">
                  <span className="target-value">4/5</span>
                </div>
                <span className="target-label">Workouts This Week</span>
              </div>
              <div className="target-info">
                <p>One more workout to reach your weekly goal!</p>
                <button className="schedule-btn">Schedule Workout</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community & Challenges */}
      <section className="community-section">
        <div className="section-header">
          <h2 className="section-title">Active Challenges</h2>
          <button className="join-btn">Join Challenge</button>
        </div>
        
        <div className="challenges-grid">
          {upcomingChallenges.map((challenge, index) => (
            <div key={index} className="challenge-card">
              <div className="challenge-header">
                <span className="challenge-name">{challenge.name}</span>
                <span className="days-left">{challenge.daysLeft} days left</span>
              </div>
              <div className="challenge-stats">
                <div className="challenge-stat">
                  <span className="stat-icon">👥</span>
                  <span>{challenge.participants} participants</span>
                </div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(30 - challenge.daysLeft) / 30 * 100}%` }}
                  ></div>
                </div>
              </div>
              <button className="challenge-btn">View Details</button>
            </div>
          ))}
        </div>
      </section>

      {/* Fitness Tips */}
      <section className="tips-section">
        <h2 className="section-title">💡 Fitness Tips of the Day</h2>
        <div className="tips-carousel">
          {fitnessTips.map((tip, index) => (
            <div key={index} className="tip-card">
              <span className="tip-number">#{index + 1}</span>
              <p className="tip-text">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workout of the Day */}
      <section className="wod-section">
        <div className="wod-header">
          <h2 className="section-title">🔥 Workout of the Day</h2>
          <div className="wod-difficulty">
            <span className="difficulty-badge intermediate">Intermediate</span>
            <span className="wod-time">45-60 minutes</span>
          </div>
        </div>
        
        <div className="wod-content">
          <div className="wod-exercises">
            <h3 className="wod-title">Full Body Strength</h3>
            <div className="exercise-list">
              <div className="exercise-item">
                <span className="exercise-name">Barbell Squats</span>
                <span className="exercise-sets">4 sets × 8-10 reps</span>
              </div>
              <div className="exercise-item">
                <span className="exercise-name">Bench Press</span>
                <span className="exercise-sets">4 sets × 8-10 reps</span>
              </div>
              <div className="exercise-item">
                <span className="exercise-name">Bent Over Rows</span>
                <span className="exercise-sets">3 sets × 10-12 reps</span>
              </div>
              <div className="exercise-item">
                <span className="exercise-name">Overhead Press</span>
                <span className="exercise-sets">3 sets × 10-12 reps</span>
              </div>
            </div>
          </div>
          
          <div className="wod-actions">
            <button className="wod-start-btn">Start This Workout</button>
            <button className="wod-save-btn">Save for Later</button>
          </div>
        </div>
      </section>

      {/* Achievement Badges */}
      <section className="achievements-section">
        <div className="section-header">
          <h2 className="section-title">🏆 Recent Achievements</h2>
          <button className="all-badges-btn">View All Badges</button>
        </div>
        
        <div className="badges-grid">
          <div className="badge-card">
            <span className="badge-icon">🔥</span>
            <div className="badge-info">
              <span className="badge-name">7 Day Streak</span>
              <span className="badge-date">Earned Today</span>
            </div>
          </div>
          <div className="badge-card">
            <span className="badge-icon">💪</span>
            <div className="badge-info">
              <span className="badge-name">Strength Master</span>
              <span className="badge-date">2 days ago</span>
            </div>
          </div>
          <div className="badge-card">
            <span className="badge-icon">🏃</span>
            <div className="badge-info">
              <span className="badge-name">Cardio Crusher</span>
              <span className="badge-date">Last week</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;