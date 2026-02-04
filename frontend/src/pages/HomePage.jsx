import { useEffect, useState } from "react";
import "./HomePage.css";
import { supabase } from "../supabaseClient";

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    displayName: "User",
    totalWorkouts: 0,
    streak: 0,
    level: 1,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    recentWorkouts: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      setLoading(true);

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authUser = authRes.user;

        const { data: userRow, error: uErr } = await supabase
          .from("Users")
          .select("id, auth_id, display_name")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!userRow) throw new Error("No Users row found.");

        const appUserId = userRow.id;
        const displayName = userRow.display_name || authUser.email || "User";

        const { count: workoutsCount, error: wcErr } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", appUserId);

        if (wcErr) throw wcErr;

        const totalWorkouts = workoutsCount ?? 0;
        const workoutsPerLevel = 5;
        const level = Math.max(1, 1 + Math.floor(totalWorkouts / workoutsPerLevel));

        const { data: logs, error: lErr } = await supabase
          .from("ExerciseLog")
          .select("date")
          .eq("user_id", appUserId);

        if (lErr) throw lErr;

        const streak = calcStreakDaysFromLogs(logs ?? []);
        const weeklyActivity = calculateWeeklyActivity(logs ?? []);

        const { data: recentWorkouts, error: rwErr } = await supabase
          .from("Workouts")
          .select("id, name, created_at")
          .eq("user_id", appUserId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (rwErr) throw rwErr;

        if (!isMounted) return;

        setUserStats({
          displayName,
          totalWorkouts,
          streak,
          level,
          weeklyActivity,
          recentWorkouts: recentWorkouts || [],
        });
      } catch (e) {
        console.error("Failed to load stats:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading your fitness journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome back, <span className="highlight">{userStats.displayName}</span>
          </h1>
          <p className="hero-subtitle">
            Your fitness journey continues. Track, analyze, and conquer your goals.
          </p>
          <p className="hero-description">
            Every workout brings you closer to becoming the best version of yourself. 
            With comprehensive tracking, intelligent insights, and personalized recommendations, 
            Trainify empowers you to achieve sustainable fitness results.
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">💪</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.totalWorkouts}</h3>
              <p className="stat-label">Total Workouts</p>
            </div>
            <div className="stat-sparkle"></div>
          </div>

          <div className="stat-card stat-streak">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.streak}</h3>
              <p className="stat-label">Day Streak</p>
            </div>
            <div className="stat-sparkle"></div>
          </div>

          <div className="stat-card stat-level">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.level}</h3>
              <p className="stat-label">Current Level</p>
            </div>
            <div className="stat-sparkle"></div>
          </div>
        </div>
      </section>

      {/* Weekly Activity & Achievement in 2 Columns */}
      <div className="content-grid">
        {/* Weekly Activity Chart */}
        <div className="content-grid-item">
          <h2 className="section-title">Weekly Activity</h2>
          <p className="section-subtitle">
            Consistency is key to achieving your fitness goals. Track your daily workout frequency 
            and maintain momentum throughout the week.
          </p>
          <div className="activity-chart">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <div key={day} className="activity-bar-container">
                <div className="activity-bar-wrapper">
                  <div
                    className="activity-bar"
                    style={{
                      height: `${Math.max(10, userStats.weeklyActivity[index] * 20)}%`,
                    }}
                  >
                    <span className="activity-count">{userStats.weeklyActivity[index]}</span>
                  </div>
                </div>
                <span className="activity-day">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievement Showcase */}
        <div className="content-grid-item">
          <h2 className="section-title">Your Progress Journey</h2>
          <p className="section-subtitle">
            Level up your fitness game! Complete workouts to earn experience points, unlock achievements, 
            and climb the ranks. Every session counts toward your next milestone.
          </p>
          <div className="achievement-showcase">
            <div className="achievement-circle">
              <svg className="progress-ring" width="160" height="160">
                <circle
                  className="progress-ring-bg"
                  cx="80"
                  cy="80"
                  r="65"
                />
                <circle
                  className="progress-ring-fill"
                  cx="80"
                  cy="80"
                  r="65"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 65}`,
                    strokeDashoffset: `${2 * Math.PI * 65 * (1 - (userStats.totalWorkouts % 5) / 5)}`,
                  }}
                />
              </svg>
              <div className="progress-text">
                <span className="progress-number">{userStats.totalWorkouts % 5}</span>
                <span className="progress-label">/ 5</span>
                <span className="progress-sublabel">to next level</span>
              </div>
            </div>
            <div className="achievement-info">
              <h3>Level {userStats.level} Athlete</h3>
              <p>Complete {5 - (userStats.totalWorkouts % 5)} more workouts to reach Level {userStats.level + 1}</p>
              <div className="milestone-badges">
                <div className={`badge ${userStats.totalWorkouts >= 10 ? 'unlocked' : 'locked'}`}>
                  <span className="badge-icon">🏆</span>
                  <span className="badge-name">Bronze</span>
                </div>
                <div className={`badge ${userStats.totalWorkouts >= 25 ? 'unlocked' : 'locked'}`}>
                  <span className="badge-icon">🥈</span>
                  <span className="badge-name">Silver</span>
                </div>
                <div className={`badge ${userStats.totalWorkouts >= 50 ? 'unlocked' : 'locked'}`}>
                  <span className="badge-icon">🥇</span>
                  <span className="badge-name">Gold</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Workouts & About in 2 Columns */}
      <div className="bottom-grid">
        {/* Recent Workouts */}
        <div className="bottom-grid-item">
          <h2 className="section-title">Recent Workouts</h2>
          <p className="section-subtitle">
            Review your latest training sessions and stay motivated by seeing your progress over time. 
            Build on your momentum and keep pushing forward.
          </p>
          {userStats.recentWorkouts.length > 0 ? (
            <div className="recent-list">
              {userStats.recentWorkouts.map((workout, index) => (
                <div key={workout.id} className="recent-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="recent-icon">🏋️</div>
                  <div className="recent-content">
                    <h4 className="recent-name">{workout.name}</h4>
                    <p className="recent-date">
                      {new Date(workout.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No workouts yet. Start your first one!</p>
            </div>
          )}
        </div>

        {/* About App */}
        <div className="bottom-grid-item">
          <div className="about-content">
            <h2 className="about-title">Why Trainify?</h2>
            <p className="about-text">
              Trainify is more than just a fitness tracker—it's your personal training companion designed 
              to transform the way you approach health and wellness. Our platform combines cutting-edge 
              technology with proven fitness methodologies to deliver a comprehensive solution for athletes 
              of all levels.
            </p>
            <div className="features-grid">
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div>
                  <h4>Smart Analytics</h4>
                  <p>
                    Gain deep insights into your performance with detailed charts, progress tracking, 
                    and trend analysis.
                  </p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🎯</div>
                <div>
                  <h4>Personalized Goals</h4>
                  <p>
                    Set custom fitness objectives tailored to your lifestyle and track your progress 
                    in real-time.
                  </p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🏆</div>
                <div>
                  <h4>Gamified Achievements</h4>
                  <p>
                    Stay motivated with our reward system. Unlock badges, level up, and compete with 
                    yourself.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function calcStreakDaysFromLogs(logs) {
  const days = new Set(logs.map((l) => l.date).filter(Boolean));
  let streak = 0;

  for (let i = 0; ; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else break;
  }

  return streak;
}

function calculateWeeklyActivity(logs) {
  const activity = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  logs.forEach((log) => {
    const logDate = new Date(log.date);
    const diffDays = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
    const weekDay = diffDays - mondayOffset;

    if (weekDay >= 0 && weekDay < 7) {
      activity[weekDay]++;
    }
  });

  return activity;
}

export default HomePage;