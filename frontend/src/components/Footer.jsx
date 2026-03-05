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
      { label: "За приложението", page: "about" },
      { label: "Политика за поверителност", page: "privacy" },
      { label: "Общи условия", page: "terms" },
      { label: "Бисквитки", page: "cookies" },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      setLoading(true);

      try {
        const { count: usersCount } = await supabase
          .from("Users")
          .select("id", { count: "exact", head: true });

        const { count: workoutsCount } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true });

        const { count: exerciseLogsCount } = await supabase
          .from("ExerciseLog")
          .select("id", { count: "exact", head: true });

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
            <TrainifyLogo as="div" className="tf-logo" />

            <p className="tf-footer-desc">
              Trainify ти помага да записваш тренировките си, да следиш храненето
              и да виждаш прогреса си ясно — на едно място.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="tf-footer-title">Информация</h4>

            <div className="tf-links">
              {links.map((l) => (
                <button
                  key={l.page}
                  className="tf-link"
                  onClick={() => go(l.page)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h4 className="tf-footer-title">Статистика</h4>

            <div className="tf-stats-grid">
              <div className="tf-stat">
                <div className="tf-stat-number">{stats.users ?? "—"}</div>
                <div className="tf-stat-label">Потребители</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.workouts ?? "—"}</div>
                <div className="tf-stat-label">Тренировки</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.exerciseLogs ?? "—"}</div>
                <div className="tf-stat-label">Упражнения</div>
              </div>

              <div className="tf-stat">
                <div className="tf-stat-number">{stats.foodLogs ?? "—"}</div>
                <div className="tf-stat-label">Хранителни записи</div>
              </div>
            </div>

            {loading && <div className="tf-loading">Обновяване…</div>}
          </div>

          {/* Contacts */}
          <div>
            <h4 className="tf-footer-title">Контакти</h4>

            <div className="tf-contact-list">
              <div className="tf-contact-item">
                <div className="tf-contact-icon"></div>
                <div className="tf-contact-text">
                  <div className="tf-contact-label">Имейл</div>
                  <div className="tf-contact-value">
                    <a href="mailto:support@trainify.app">
                      support@trainify.app
                    </a>
                  </div>
                </div>
              </div>

              <div className="tf-contact-item">
                <div className="tf-contact-icon"></div>
                <div className="tf-contact-text">
                  <div className="tf-contact-label">Телефон</div>
                  <div className="tf-contact-value">
                    <a href="tel:+359888123456">+359 888 123 456</a>
                  </div>
                </div>
              </div>

              <div className="tf-contact-item">
                <div className="tf-contact-icon"></div>
                <div className="tf-contact-text">
                  <div className="tf-contact-label">Локация</div>
                  <div className="tf-contact-value">Sofia, Bulgaria</div>
                </div>
              </div>
            </div>

            <div className="tf-social">
              <div className="tf-social-link">Instagram</div>
              <div className="tf-social-link">GitHub</div>
              <div className="tf-social-link">LinkedIn</div>
            </div>
          </div>

        </div>

        <div className="tf-footer-bottom">
          <div className="tf-copyright">
            © {currentYear} Trainify. Всички права запазени.
          </div>
        </div>
      </div>
    </footer>
  );
}