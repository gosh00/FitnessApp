import { useEffect, useMemo, useState } from "react";
import "./HomePage.css";
import { supabase } from "../supabaseClient";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WORKOUTS_PER_LEVEL = 5;

const HomePage = ({ setPage }) => {
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
        const level = Math.max(1, 1 + Math.floor(totalWorkouts / WORKOUTS_PER_LEVEL));

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

  const levelProgress = useMemo(() => {
    const inLevel = userStats.totalWorkouts % WORKOUTS_PER_LEVEL;
    const remaining = WORKOUTS_PER_LEVEL - inLevel;
    const pct = (inLevel / WORKOUTS_PER_LEVEL) * 100;
    return { inLevel, remaining, pct };
  }, [userStats.totalWorkouts]);

  const weeklyMeta = useMemo(() => {
    const max = Math.max(...userStats.weeklyActivity, 0);
    const total = userStats.weeklyActivity.reduce((a, b) => a + b, 0);
    return { max, total };
  }, [userStats.weeklyActivity]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-container">
          <div className="loader" />
          <p>Loading your fitness journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-top">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              <span>Trainify Dashboard</span>
            </div>

            <h1 className="hero-title">
              {greeting},{" "}
              <span className="highlight">{userStats.displayName}</span>
            </h1>

            <p className="hero-subtitle">
              Stay consistent. Track your progress. Level up every week.
            </p>

            <div className="hero-actions">
              <button className="primary-btn" onClick={() => setPage?.("log-workout")}>
                Start Workout
              </button>
              <button className="ghost-btn" onClick={() => setPage?.("workouts")}>
                View Workouts
              </button>
              <button className="ghost-btn" onClick={() => setPage?.("exercises")}>
                Exercises
              </button>
            </div>
          </div>

          <div className="hero-kpis">
            <div className="kpi">
              <div className="kpi-label">This week</div>
              <div className="kpi-value">{weeklyMeta.total}</div>
              <div className="kpi-sub">sessions logged</div>
            </div>

            <div className="kpi">
              <div className="kpi-label">Streak</div>
              <div className="kpi-value">{userStats.streak}</div>
              <div className="kpi-sub">days</div>
            </div>

            <div className="kpi">
              <div className="kpi-label">Level</div>
              <div className="kpi-value">{userStats.level}</div>
              <div className="kpi-sub">{levelProgress.remaining} to next</div>
            </div>
          </div>

          <div className="hero-progress">
            <div className="hero-progress-row">
              <span className="hero-progress-title">Next level progress</span>
              <span className="hero-progress-meta">
                {levelProgress.inLevel}/{WORKOUTS_PER_LEVEL}
              </span>
            </div>
            <div className="hero-progress-bar">
              <div
                className="hero-progress-fill"
                style={{ width: `${levelProgress.pct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* STATS CARDS */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">💪</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.totalWorkouts}</h3>
              <p className="stat-label">Total Workouts</p>
            </div>
            <div className="stat-sparkle" />
          </div>

          <div className="stat-card stat-streak">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.streak}</h3>
              <p className="stat-label">Day Streak</p>
            </div>
            <div className="stat-sparkle" />
          </div>

          <div className="stat-card stat-level">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.level}</h3>
              <p className="stat-label">Current Level</p>
            </div>
            <div className="stat-sparkle" />
          </div>
        </div>
      </section>

      {/* GRID: Weekly + Progress */}
      <div className="content-grid">
        <div className="content-grid-item">
          <h2 className="section-title">Weekly Activity</h2>
          <p className="section-subtitle">
            Each bar shows how many sessions you logged per day.
          </p>

          <div className="activity-chart">
            {DAYS.map((day, index) => {
              const value = userStats.weeklyActivity[index] || 0;
              const pct = weeklyMeta.max === 0 ? 0 : (value / weeklyMeta.max) * 100;
              const isToday = isTodayIndex(index);

              return (
                <div key={day} className="activity-bar-container">
                  <div className="activity-bar-wrapper">
                    <div
                      className={`activity-bar ${isToday ? "today" : ""}`}
                      style={{ height: `${Math.max(8, pct)}%` }}
                      title={`${day}: ${value}`}
                      aria-label={`${day}: ${value}`}
                    >
                      <span className="activity-count">{value}</span>
                    </div>
                  </div>
                  <span className={`activity-day ${isToday ? "today" : ""}`}>{day}</span>
                </div>
              );
            })}
          </div>

          <div className="mini-hint">
            Tip: aim for <span className="accent-text">3–4 sessions/week</span> to build momentum.
          </div>
        </div>

        <div className="content-grid-item">
          <h2 className="section-title">Your Progress Journey</h2>
          <p className="section-subtitle">
            Complete workouts to level up and unlock milestones.
          </p>

          <div className="achievement-showcase">
            <div className="achievement-circle">
              <svg className="progress-ring" width="160" height="160">
                <circle className="progress-ring-bg" cx="80" cy="80" r="65" />
                <circle
                  className="progress-ring-fill"
                  cx="80"
                  cy="80"
                  r="65"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 65}`,
                    strokeDashoffset: `${
                      2 * Math.PI * 65 * (1 - levelProgress.inLevel / WORKOUTS_PER_LEVEL)
                    }`,
                  }}
                />
              </svg>

              <div className="progress-text">
                <span className="progress-number">{levelProgress.inLevel}</span>
                <span className="progress-label">/ {WORKOUTS_PER_LEVEL}</span>
                <span className="progress-sublabel">to next level</span>
              </div>
            </div>

            <div className="achievement-info">
              <h3>Level {userStats.level} Athlete</h3>
              <p>
                Complete <strong>{levelProgress.remaining}</strong> more workout
                {levelProgress.remaining === 1 ? "" : "s"} to reach{" "}
                <strong>Level {userStats.level + 1}</strong>.
              </p>

              <div className="milestone-badges">
                <div className={`badge ${userStats.totalWorkouts >= 10 ? "unlocked" : "locked"}`}>
                  <span className="badge-icon">🏆</span>
                  <span className="badge-name">Bronze</span>
                </div>
                <div className={`badge ${userStats.totalWorkouts >= 25 ? "unlocked" : "locked"}`}>
                  <span className="badge-icon">🥈</span>
                  <span className="badge-name">Silver</span>
                </div>
                <div className={`badge ${userStats.totalWorkouts >= 50 ? "unlocked" : "locked"}`}>
                  <span className="badge-icon">🥇</span>
                  <span className="badge-name">Gold</span>
                </div>
              </div>

              <div className="progress-cta">
                <button className="ghost-btn" onClick={() => setPage?.("log-workout")}>
                  Log a workout now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID: Recent + About */}
      <div className="bottom-grid">
        <div className="bottom-grid-item">
          <h2 className="section-title">Recent Workouts</h2>
          <p className="section-subtitle">
            Review your latest sessions and keep momentum.
          </p>

          {userStats.recentWorkouts.length > 0 ? (
            <div className="recent-list">
              {userStats.recentWorkouts.map((workout, index) => (
                <button
                  key={workout.id}
                  className="recent-item recent-item-btn"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => setPage?.("workouts")}
                >
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
                  <div className="recent-arrow">›</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No workouts yet. Start your first one!</p>
              <button className="primary-btn" onClick={() => setPage?.("log-workout")}>
                Start Workout
              </button>
            </div>
          )}
        </div>

        <div className="bottom-grid-item">
          <div className="about-content">
            <h2 className="about-title">Why Trainify?</h2>
            <p className="about-text">
              Trainify is your training companion — designed to keep you consistent,
              motivated, and in control of your progress.
            </p>

            <div className="features-grid">
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div>
                  <h4>Smart Analytics</h4>
                  <p>Visualize trends and improvements over time.</p>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">🎯</div>
                <div>
                  <h4>Personalized Goals</h4>
                  <p>Stay aligned with what matters most to you.</p>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">🏆</div>
                <div>
                  <h4>Gamified Achievements</h4>
                  <p>Level up, unlock badges, and beat your own records.</p>
                </div>
              </div>
            </div>

            <div className="about-actions">
              <button className="ghost-btn" onClick={() => setPage?.("profile")}>
                Update your goal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== helpers ===== */

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

/**
 * Returns [Mon..Sun] counts for the current week.
 */
function calculateWeeklyActivity(logs) {
  const activity = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();

  // Monday of this week
  const day = today.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - diffToMonday);

  logs.forEach((log) => {
    if (!log?.date) return;

    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    const diffMs = logDate - monday;
    const idx = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 0..6
    if (idx >= 0 && idx < 7) activity[idx] += 1;
  });

  return activity;
}

/** highlight today's column (Mon=0..Sun=6) */
function isTodayIndex(monIndex) {
  const d = new Date();
  const day = d.getDay(); // 0 Sun..6 Sat
  const idx = day === 0 ? 6 : day - 1;
  return monIndex === idx;
}

export default HomePage;
