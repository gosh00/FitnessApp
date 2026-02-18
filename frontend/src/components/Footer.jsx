import { useEffect, useMemo, useState } from "react";
import "./Footer.css";
import { supabase } from "../supabaseClient";
import TrainifyLogo from "../components/TrainifyLogo";

export default function Footer({ setPage }) {
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState({
    users: null,
    workouts: null,
    exerciseLogs: null,
    foodLogs: null,
  });

  const [loading, setLoading] = useState(false);

  const links = useMemo(
    () => [
      { label: "About", page: "about" },
      { label: "Privacy Policy", page: "privacy" },
      { label: "Terms of Service", page: "terms" },
      { label: "Cookies", page: "cookies" },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      setLoading(true);
      try {
        // ✅ Users count
        const { count: usersCount } = await supabase
          .from("Users")
          .select("id", { count: "exact", head: true });

        // ✅ Workouts count
        const { count: workoutsCount } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true });

        // ✅ ExerciseLog count
        const { count: exerciseLogsCount } = await supabase
          .from("ExerciseLog")
          .select("id", { count: "exact", head: true });

        // ✅ FoodLogs count (if you have table named FoodLogs)
        const { count: foodLogsCount } = await supabase
          .from("FoodLogs")
          .select("id", { count: "exact", head: true });

        if (!mounted) return;

        setStats({
          users: usersCount ?? 0,
          workouts: workoutsCount ?? 0,
          exerciseLogs: exerciseLogsCount ?? 0,
          foodLogs: foodLogsCount ?? 0,
        });
      } catch {
        // if anything fails, keep nulls (footer will show "—")
        if (!mounted) return;
        setStats((p) => ({ ...p }));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const go = (page) => {
    if (typeof setPage === "function") setPage(page);
  };

  return (
    <footer className="tf-footer">
      <div className="tf-footer-container">
        <div className="tf-footer-top">
          {/* Brand */}
          <div className="tf-footer-brand">
            <div className="tf-footer-logo" role="img" aria-label="Trainify">
              <TrainifyLogo as="div" className="tf-logo" />
            </div>

            <p className="tf-footer-desc">
              Trainify helps you log workouts, track nutrition, and see progress clearly — all in one place.
            </p>
          </div>

          {/* Links */}
          <div className="tf-footer-links">
            <h4 className="tf-footer-title">Info</h4>
            <div className="tf-links">
              {links.map((l) => (
                <button
                  key={l.page}
                  type="button"
                  className="tf-link"
                  onClick={() => go(l.page)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="tf-footer-stats">
            <h4 className="tf-footer-title">Live Stats</h4>

            <div className="tf-stats-grid" aria-busy={loading ? "true" : "false"}>
              <div className="tf-stat">
                <div className="tf-stat-number">{stats.users ?? "—"}</div>
                <div className="tf-stat-label">Users</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.workouts ?? "—"}</div>
                <div className="tf-stat-label">Workouts</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.exerciseLogs ?? "—"}</div>
                <div className="tf-stat-label">Exercise Logs</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.foodLogs ?? "—"}</div>
                <div className="tf-stat-label">Food Entries</div>
              </div>
            </div>

            {loading ? <div className="tf-loading">Updating…</div> : null}
          </div>
        </div>

        <div className="tf-footer-bottom">
          <div className="tf-copyright">
            © {currentYear} Trainify. All rights reserved.
          </div>

         {/* 
         <div className="tf-bottom-links">
            <button type="button" className="tf-mini-link" onClick={() => go("privacy")}>
              Privacy
            </button>
            <span className="tf-dot">•</span>
            <button type="button" className="tf-mini-link" onClick={() => go("terms")}>
              Terms
            </button>
            <span className="tf-dot">•</span>
            <button type="button" className="tf-mini-link" onClick={() => go("cookies")}>
              Cookies
            </button>
          </div>
          */}
        </div>
      </div>
    </footer>
  );
}
