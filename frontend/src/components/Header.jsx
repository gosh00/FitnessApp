import { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { supabase } from "../supabaseClient";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [userStats, setUserStats] = useState({
    displayName: "User",
    avatarUrl: null,
    streak: 0,
    level: 1,
    levelProgressPct: 0,
  });

  const goToProfile = () => {
    // сменя страницата директно
    window.location.href = "/profile";
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/"; // към login/home
    } catch (err) {
      alert("Logout failed: " + (err?.message || err));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadHeaderStats = async () => {
      setLoading(true);
      setPageError("");

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authUser = authRes.user;

        const { data: userRow, error: uErr } = await supabase
          .from("Users")
          .select("id, auth_id, display_name, avatar_url")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!userRow) throw new Error("No Users row found.");

        const appUserId = userRow.id;

        const displayName = userRow.display_name || authUser.email || "User";
        const avatarUrl = userRow.avatar_url || null;

        const { count: workoutsCount, error: wcErr } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", appUserId);

        if (wcErr) throw wcErr;

        const workouts = workoutsCount ?? 0;
        const workoutsPerLevel = 5;
        const level = Math.max(1, 1 + Math.floor(workouts / workoutsPerLevel));
        const withinLevel = workouts % workoutsPerLevel;
        const levelProgressPct = Math.round((withinLevel / workoutsPerLevel) * 100);

        const { data: logs, error: lErr } = await supabase
          .from("ExerciseLog")
          .select("date")
          .eq("user_id", appUserId);

        if (lErr) throw lErr;

        const streak = calcStreakDaysFromLogs(logs ?? []);

        if (!isMounted) return;

        setUserStats({
          displayName,
          avatarUrl,
          streak,
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

  const initials = useMemo(() => {
    const n = (userStats.displayName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [userStats.displayName]);

  return (
    <header className="header">
      <div className="header-container header-compact">
        {/* LEFT */}
        <div className="header-left header-left-profile">
          <button
            onClick={goToProfile}
            className="profile-chip"
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "inherit",
              font: "inherit",
            }}
          >
            {userStats.avatarUrl ? (
              <img src={userStats.avatarUrl} alt="avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar fallback">{initials}</div>
            )}
            <span className="profile-name">{userStats.displayName}</span>
          </button>

          <div className="user-level compact">
            <span className="level-label">Level {userStats.level}</span>
            <div className="level-progress">
              <div className="level-fill" style={{ width: `${userStats.levelProgressPct}%` }} />
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="header-center">
          <h1 className="app-title">Fitness Pro</h1>
          <p className="app-subtitle">Track Your Gym Progression</p>
          {loading && <p style={{ fontSize: 12 }}>Loading…</p>}
          {pageError && <p style={{ fontSize: 12, color: "salmon" }}>{pageError}</p>}
        </div>

        {/* RIGHT */}
        <div className="header-right header-right-streak">
          <div className="streak-badge">
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{userStats.streak} days</span>
          </div>

          {/* ✅ LOGOUT BUTTON (desktop) */}
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              marginLeft: 12,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            Logout
          </button>

          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen((v) => !v)}>
            <i className={`fas ${isMenuOpen ? "fa-times" : "fa-bars"}`} />
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="mobile-stats">
          <button
            onClick={goToProfile}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div className="mobile-stat">
              <span className="mobile-stat-icon">👤</span>
              <div className="mobile-stat-info">
                <span className="mobile-stat-value">{userStats.displayName}</span>
                <span className="mobile-stat-label">Profile</span>
              </div>
            </div>
          </button>

          {/* ✅ LOGOUT BUTTON (mobile) */}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            <div className="mobile-stat">
              <span className="mobile-stat-icon">🚪</span>
              <div className="mobile-stat-info">
                <span className="mobile-stat-value">Logout</span>
                <span className="mobile-stat-label">Sign out</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
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

export default Header;
