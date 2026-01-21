import { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { supabase } from "../supabaseClient"; // ако е в src/lib -> "../lib/supabaseClient"

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [userStats, setUserStats] = useState({
    streak: 0,
    weight: null,
    goal: "Maintain Weight",
    level: 1,
    levelProgressPct: 0,
  });

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  useEffect(() => {
    let isMounted = true;

    const loadHeaderStats = async () => {
      setLoading(true);
      setPageError("");

      try {
        // 1) auth
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authId = authRes.user.id;

        // 2) Users row (по auth_id)
        const { data: userRow, error: uErr } = await supabase
          .from("Users")
          .select("id, goal, weight, auth_id")
          .eq("auth_id", authId)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!userRow) throw new Error("No Users row found. Open Profile once to create it.");

        const appUserId = userRow.id;

        // 3) total workouts count (за level)
        const { count: workoutsCount, error: wcErr } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", appUserId);

        if (wcErr) throw wcErr;

        // level formula (пример)
        const workouts = workoutsCount ?? 0;
        const workoutsPerLevel = 5; // смени както искаш
        const level = Math.max(1, 1 + Math.floor(workouts / workoutsPerLevel));
        const withinLevel = workouts % workoutsPerLevel;
        const levelProgressPct = Math.round((withinLevel / workoutsPerLevel) * 100);

        // 4) streak from ExerciseLog
        const { data: logs, error: lErr } = await supabase
          .from("ExerciseLog")
          .select("date")
          .eq("user_id", appUserId);

        if (lErr) throw lErr;

        const streak = calcStreakDaysFromLogs(logs ?? []);

        if (!isMounted) return;

        setUserStats({
          streak,
          weight: userRow.weight === null || userRow.weight === undefined ? null : Number(userRow.weight),
          goal: userRow.goal || "Maintain Weight",
          level,
          levelProgressPct,
        });
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Failed to load header stats.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHeaderStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const weightText = useMemo(() => {
    if (userStats.weight === null || Number.isNaN(userStats.weight)) return "—";
    // ако при теб weight е в kg, оставям kg:
    return `${userStats.weight} kg`;
    // ако искаш lbs:
    // return `${Math.round(userStats.weight * 2.20462)} lbs`;
  }, [userStats.weight]);

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
              <div className="level-fill" style={{ width: `${userStats.levelProgressPct}%` }}></div>
            </div>
          </div>
        </div>

        <div className="header-center">
          <h1 className="app-title">FitTrack Pro</h1>
          <p className="app-subtitle">Track Your Gym Progression</p>
          {loading && <p style={{ fontSize: 12, opacity: 0.8 }}>Loading…</p>}
          {pageError && <p style={{ fontSize: 12, color: "salmon" }}>{pageError}</p>}
        </div>

        <div className="header-right">
          <button className="header-btn quick-actions" aria-label="Quick Actions">
            <span className="btn-icon">⚡</span>
            <span className="btn-text">Quick Start</span>
          </button>

          <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <i className={`fas ${isMenuOpen ? "fa-times" : "fa-bars"}`}></i>
          </button>

          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-value">{weightText}</span>
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

      <div className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
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
              <span className="mobile-stat-value">{weightText}</span>
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

function calcStreakDaysFromLogs(logs) {
  // logs: [{date: 'YYYY-MM-DD'}, ...]
  const days = new Set((logs ?? []).map((l) => l.date).filter(Boolean));
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

export default Header;
