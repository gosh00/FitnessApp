import { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { supabase } from "../supabaseClient";
import TrainifyLogo from "../components/TrainifyLogo";

const DEFAULT_AVATAR = "/default-avatar.png";

function withBust(url, token) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${token}`;
}

const Header = ({ setPage, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // ✅ changes when avatar/profile is updated → forces new avatar URL
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());

  const [userStats, setUserStats] = useState({
    displayName: "Потребител",
    avatarUrl: null, // raw base URL (no cache bust here)
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

    const loadHeaderStats = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setPageError("");

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("Няма активен потребител.");

        const authUser = authRes.user;

        const { data: userRow, error: uErr } = await supabase
          .from("Users")
          .select("id, auth_id, display_name, avatar_url")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!userRow) throw new Error("Липсва профил в таблица Users.");

        const appUserId = userRow.id;
        const displayName = userRow.display_name || authUser.email || "Потребител";

        // ✅ Resolve avatar from DB (avatar_url)
        let avatarUrl = null;
        const rawAvatar = userRow.avatar_url;

        if (rawAvatar) {
          if (/^https?:\/\//i.test(rawAvatar)) {
            avatarUrl = rawAvatar; // full URL
          } else {
            // storage path
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
          avatarUrl, // store base url only (no bust)
          streak,
          level,
          levelProgressPct,
        });
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Неуспешно зареждане на данните в заглавната лента.");
      } finally {
        if (isMounted && !silent) setLoading(false);
        if (isMounted && silent) setLoading(false); // ensure first load ends
      }
    };

    loadHeaderStats();

    const onWorkoutSaved = () => loadHeaderStats({ silent: true });

    const onProfileSaved = () => {
      // ✅ change version so avatar URL becomes new
      setAvatarVersion(Date.now());
      loadHeaderStats({ silent: true });
    };

    window.addEventListener("workout_saved", onWorkoutSaved);
    window.addEventListener("profile_saved", onProfileSaved);

    return () => {
      isMounted = false;
      window.removeEventListener("workout_saved", onWorkoutSaved);
      window.removeEventListener("profile_saved", onProfileSaved);
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

  // ✅ final src with cache-bust
  const avatarSrc = useMemo(() => {
    const base = userStats.avatarUrl || DEFAULT_AVATAR;
    return withBust(base, avatarVersion);
  }, [userStats.avatarUrl, avatarVersion]);

  return (
    <header className="header">
      <div className="header-container header-compact">
        {/* LEFT */}
        <div className="header-left header-left-profile profile-area">
          <button onClick={() => setIsProfileOpen((v) => !v)} className="profile-chip">
            <img
              key={avatarSrc} // ✅ forces re-render if url changes
              src={avatarSrc}
              alt="аватар"
              className="profile-avatar"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />

            <span className="profile-name">{userStats.displayName}</span>
            <span className="profile-caret">▾</span>
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <button onClick={goToProfile}>👤 Профил</button>
              <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
              <button onClick={handleLogout}>🚪 Изход</button>
            </div>
          )}

          <div className="user-level compact">
            <span className="level-label">Ниво {userStats.level}</span>
            <div className="level-progress">
              <div className="level-fill" style={{ width: `${userStats.levelProgressPct}%` }} />
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="header-center">
          <TrainifyLogo as="div" className="header-logo-text" />
          <div className="header-logo-tagline">Проследяване на фитнес прогрес</div>

          {loading && <p>Зареждане…</p>}
          {pageError && <p style={{ color: "salmon" }}>{pageError}</p>}
        </div>

        {/* RIGHT */}
        <div className="header-right header-right-streak">
          <div className={`streak-badge ${userStats.streak > 0 ? "active" : ""}`}>
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{userStats.streak} дни</span>
          </div>
        </div>
      </div>
    </header>
  );
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
    } else break;
  }

  return streak;
}

export default Header;