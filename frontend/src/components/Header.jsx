import { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { supabase } from "../supabaseClient";

const Header = ({ setPage, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [userStats, setUserStats] = useState({
    displayName: "User",
    avatarUrl: null,
    streak: 0,
    level: 1,
    levelProgressPct: 0,
  });

  const goToProfile = () => {
    setIsProfileOpen(false);
    setPage?.("profile");
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await onLogout?.();
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

        // ✅ Correct column: avatar_url
        const { data: userRow, error: uErr } = await supabase
          .from("Users")
          .select("id, auth_id, display_name, avatar_url")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!userRow) throw new Error("No Users row found.");

        const appUserId = userRow.id;

        const displayName = userRow.display_name || authUser.email || "User";

        // ✅ Resolve avatar from DB (avatar_url)
        // Works for:
        // - full URL: https://...
        // - storage path: avatars/xxx.png  (bucket assumed "avatars")
        let avatarUrl = null;
        const rawAvatar = userRow.avatar_url;

        if (rawAvatar) {
          if (/^https?:\/\//i.test(rawAvatar)) {
            avatarUrl = rawAvatar;
          } else {
            // If you use Supabase Storage and store only the path
            const { data } = supabase.storage.from("avatars").getPublicUrl(rawAvatar);
            avatarUrl = data?.publicUrl || null;
          }
        }

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

    const onSaved = () => loadHeaderStats();
    window.addEventListener("workout_saved", onSaved);

    return () => {
      isMounted = false;
      window.removeEventListener("workout_saved", onSaved);
    };
  }, []);

  // close dropdown when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (!isProfileOpen) return;
      const target = e.target;
      if (target.closest?.(".profile-area")) return;
      setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isProfileOpen]);

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
        <div className="header-left header-left-profile profile-area" style={{ position: "relative" }}>
          <button
            onClick={() => setIsProfileOpen((v) => !v)}
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
            <span style={{ fontSize: 12, opacity: 0.8 }}>▾</span>
          </button>

          {isProfileOpen && (
            <div
              className="profile-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                minWidth: 200,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              <button onClick={goToProfile} style={dropdownBtnStyle}>👤 Profile</button>
              <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
              <button onClick={handleLogout} style={{ ...dropdownBtnStyle, color: "#B00020" }}>
                🚪 Logout
              </button>
            </div>
          )}

          <div className="user-level compact" style={{ marginTop: 8 }}>
            <span className="level-label">Level {userStats.level}</span>
            <div className="level-progress">
              <div className="level-fill" style={{ width: `${userStats.levelProgressPct}%` }} />
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="header-center">
          <div className="header-logo-text">
            Trainify<span className="header-logo-dot"></span>
          </div>
          <div className="header-logo-tagline">Fitness Tracking</div>
          {loading && <p style={{ fontSize: 12, marginTop: 6 }}>Loading…</p>}
          {pageError && <p style={{ fontSize: 12, marginTop: 6, color: "salmon" }}>{pageError}</p>}
        </div>

        {/* RIGHT */}
        <div className="header-right header-right-streak">
          <div className={`streak-badge ${userStats.streak > 0 ? "active" : ""}`}>
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{userStats.streak} days</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const dropdownBtnStyle = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  background: "white",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
};

function calcStreakDaysFromLogs(logs) {
  const days = new Set((logs || []).map((l) => l?.date).filter(Boolean));
  let streak = 0;

  const d = new Date();
  d.setHours(12, 0, 0, 0);

  while (true) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;

    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export default Header;
