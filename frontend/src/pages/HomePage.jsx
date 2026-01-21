import { useEffect, useState } from "react";
import "./HomePage.css";
import { supabase } from "../supabaseClient"; // ✅ коригирай пътя ако файлът е другаде

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [displayName, setDisplayName] = useState("User");

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    caloriesBurned: 0,
    personalRecords: 0,
    streakDays: 0,
    muscleGroups: [],
  });

  const [workouts, setWorkouts] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setPageError("");

      try {
        // 1) auth user
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authId = authRes.user.id;

        // 2) app user row (Users table)
        const { data: appUser, error: appUserErr } = await supabase
          .from("Users")
          .select("id, display_name, auth_id")
          .eq("auth_id", authId)
          .single();

        if (appUserErr) throw appUserErr;

        const appUserId = appUser.id;
        if (isMounted) setDisplayName(appUser.display_name || "User");

        // 3) recent workouts (Workouts)
        const { data: workoutsRows, error: workoutsErr } = await supabase
          .from("Workouts")
          .select("id, name, data, created_at")
          .eq("user_id", appUserId)
          .order("created_at", { ascending: false })
          .limit(4);

        if (workoutsErr) throw workoutsErr;

        const mappedWorkouts = (workoutsRows ?? []).map((w) => {
          const parsed = parseWorkoutData(w.data);
          return {
            id: w.id,
            name: w.name || "Workout",
            date: formatRelativeDate(w.created_at),
            duration: parsed.duration ?? "—",
            exercises: parsed.exercisesCount ?? 0,
            calories: parsed.calories ?? 0,
          };
        });

        // 4) badges (UserBadges)
        const { data: badgeRows, error: badgesErr } = await supabase
          .from("UserBadges")
          .select("id, title, earned_at")
          .eq("user_id", appUserId)
          .order("earned_at", { ascending: false })
          .limit(3);

        if (badgesErr) throw badgesErr;

        // 5) ExerciseLog (за streak + muscle groups)
        const { data: logs, error: logsErr } = await supabase
          .from("ExerciseLog")
          .select("date, exercise_id")
          .eq("user_id", appUserId);

        if (logsErr) throw logsErr;

        // muscle groups
        const exerciseIds = Array.from(
          new Set((logs ?? []).map((l) => l.exercise_id).filter(Boolean))
        );

        let muscleGroups = [];

        if (exerciseIds.length) {
          const { data: exRows, error: exErr } = await supabase
            .from("Exercises")
            .select("id, muscle_group")
            .in("id", exerciseIds);

          if (exErr) throw exErr;

          muscleGroups = Array.from(
            new Set((exRows ?? []).map((e) => e.muscle_group).filter(Boolean))
          );
        }

        // total workouts count
        const { count: workoutsCount, error: countErr } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", appUserId);

        if (countErr) throw countErr;

        const streakDays = calcStreakDaysFromLogs(logs ?? []);
        const personalRecords = (badgeRows ?? []).length;

        if (!isMounted) return;

        setWorkouts(mappedWorkouts);
        setBadges(badgeRows ?? []);
        setStats({
          totalWorkouts: workoutsCount ?? 0,
          caloriesBurned: sumCaloriesFromWorkouts(workoutsRows ?? []),
          personalRecords,
          streakDays,
          muscleGroups,
        });
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Failed to load home data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome Back, {displayName}! 👋</h1>
          <p className="hero-subtitle">
            You're on a <span className="highlight">{stats.streakDays} day streak</span> - keep crushing it!
          </p>

          <div className="hero-stats">
            <div className="hero-stat-card">
              <span className="stat-number">{stats.totalWorkouts}</span>
              <span className="stat-label">Total Workouts</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">{Number(stats.caloriesBurned).toLocaleString()}</span>
              <span className="stat-label">Calories Burned</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">{stats.personalRecords}</span>
              <span className="stat-label">Personal Records</span>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Recent Workouts (така workouts вече се използва и warning изчезва) */}
      <section className="activity-section">
        <div className="section-header">
          <h2 className="section-title">Recent Workouts</h2>
        </div>

        <div className="workouts-grid">
          {workouts.map((w) => (
            <div key={w.id} className="workout-card">
              <div className="workout-header">
                <span className="workout-date">{w.date}</span>
              </div>

              <h3 className="workout-name">{w.name}</h3>

              <div className="workout-stats">
                <div className="workout-stat">
                  <span className="stat-icon">⏱️</span>
                  <span>{w.duration}</span>
                </div>
                <div className="workout-stat">
                  <span className="stat-icon">🏋️</span>
                  <span>{w.exercises} exercises</span>
                </div>
                <div className="workout-stat">
                  <span className="stat-icon">🔥</span>
                  <span>{w.calories} cal</span>
                </div>
              </div>

              <button className="workout-details-btn">View Details</button>
            </div>
          ))}

          {!workouts.length && !loading && (
            <p className="hero-subtitle">No workouts yet. Start your first one 💪</p>
          )}
        </div>
      </section>

      {/* Muscle groups */}
      <section className="progress-section">
        <h2 className="section-title">Muscle Groups Trained</h2>
        <div className="muscle-groups">
          {stats.muscleGroups.map((m, i) => (
            <div key={i} className="muscle-tag">
              {m}
            </div>
          ))}
          {!stats.muscleGroups.length && <p className="hero-subtitle">No data yet.</p>}
        </div>
      </section>

      {/* Achievements */}
      <section className="achievements-section">
        <div className="section-header">
          <h2 className="section-title">🏆 Recent Achievements</h2>
        </div>

        <div className="badges-grid">
          {badges.map((b) => (
            <div key={b.id} className="badge-card">
              <span className="badge-icon">🏅</span>
              <div className="badge-info">
                <span className="badge-name">{b.title}</span>
                <span className="badge-date">{formatRelativeDate(b.earned_at)}</span>
              </div>
            </div>
          ))}

          {!badges.length && !loading && (
            <p className="hero-subtitle">No badges yet — keep going!</p>
          )}
        </div>
      </section>

      {loading && <p>Loading...</p>}
      {pageError && <p style={{ color: "red" }}>{pageError}</p>}
    </div>
  );
};

// ---------- helpers ----------
function formatRelativeDate(dateValue) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday - startD) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function parseWorkoutData(data) {
  if (!data || typeof data !== "object") return {};
  const durationMin = data.durationMinutes ?? data.duration_minutes;
  const calories = data.calories;
  const exercisesCount = Array.isArray(data.exercises) ? data.exercises.length : data.exercisesCount;

  return {
    duration: typeof durationMin === "number" ? `${durationMin} min` : null,
    calories: typeof calories === "number" ? calories : null,
    exercisesCount: typeof exercisesCount === "number" ? exercisesCount : null,
  };
}

function sumCaloriesFromWorkouts(workoutsRows) {
  let sum = 0;
  for (const w of workoutsRows) {
    const p = parseWorkoutData(w.data);
    if (typeof p.calories === "number") sum += p.calories;
  }
  return sum;
}

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

export default HomePage;
