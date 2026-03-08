import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./HomePage.module.css";

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ✅ Streak: 0 if no workout today, otherwise count back consecutive days
function calcStreakDaysFromLogs(logs) {
  const days = new Set(logs.map((l) => l.date).filter(Boolean));
  const todayKey = getLocalDateKey();

  if (!days.has(todayKey)) return 0;

  let streak = 0;
  const d = new Date();
  d.setHours(12, 0, 0, 0);

  while (true) {
    const key = getLocalDateKey(d);
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  return streak;
}

// ✅ Weekly activity: counts unique days per weekday slot (Пн=0 ... Нд=6)
// Uses the current Mon–Sun week only, based on local date strings
function calculateWeeklyActivity(logs) {
  const activity = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 ... Sun=6

  // Find Monday of current week
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  // Build a set of (dateKey → weekday index) for this week
  const weekMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekMap[getLocalDateKey(d)] = i;
  }

  // Count unique exercises per day (not per log row)
  // Group by date first to avoid double-counting multiple sets on same day
  const dayCounts = {};
  logs.forEach((log) => {
    const key = log.date;
    if (key && weekMap[key] !== undefined) {
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    }
  });

  Object.entries(dayCounts).forEach(([key, count]) => {
    const idx = weekMap[key];
    if (idx !== undefined) activity[idx] = count;
  });

  return activity;
}

const HomePage = ({ currentUser, setPage }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    displayName: "Спортист",
    totalWorkouts: 0,
    streak: 0,
    level: 1,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    recentWorkouts: [],
    totalExercises: 0,
    totalSets: 0,
  });

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const { data: authRes } = await supabase.auth.getUser();
        if (!authRes?.user) throw new Error("No user");

        const { data: userRow } = await supabase
          .from("Users")
          .select("id, display_name")
          .eq("auth_id", authRes.user.id)
          .maybeSingle();

        if (!userRow) throw new Error("No Users row");

        const userId = userRow.id;
        const displayName = userRow.display_name || authRes.user.email || "Спортист";

        const { count: workoutsCount } = await supabase
          .from("Workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        const totalWorkouts = workoutsCount ?? 0;
        const level = Math.max(1, 1 + Math.floor(totalWorkouts / 5));

        const { data: logs } = await supabase
          .from("ExerciseLog")
          .select("date")
          .eq("user_id", userId);

        const streak = calcStreakDaysFromLogs(logs ?? []);
        const weeklyActivity = calculateWeeklyActivity(logs ?? []);

        const { data: recentWorkouts } = await supabase
          .from("Workouts")
          .select("id, name, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        const { count: exercisesCount } = await supabase
          .from("ExerciseLog")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        const { data: setsData } = await supabase
          .from("ExerciseLog")
          .select("sets")
          .eq("user_id", userId);

        const totalSets = setsData?.reduce((sum, log) => sum + (log.sets || 0), 0) || 0;

        if (!mounted) return;

        setStats({
          displayName,
          totalWorkouts,
          streak,
          level,
          weeklyActivity,
          recentWorkouts: recentWorkouts || [],
          totalExercises: exercisesCount || 0,
          totalSets,
        });
      } catch (e) {
        console.error("Failed to load stats:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => { mounted = false; };
  }, [currentUser]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Зареждане на фитнес данните…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Добре дошли, {stats.displayName}</h1>
          <p className={styles.heroSubtitle}>
            Следи прогреса си, записвай тренировки и постигай целите си с Trainify
          </p>
          <p className={styles.heroDescription}>
            Твоят фитнес помощник, който ти помага да бъдеш последователен/на, да наблюдаваш подобрението си
            и да изградиш устойчиви навици. Всяка тренировка те приближава с една стъпка към най-добрата ти форма.
          </p>
        </div>
      </section>

      {/* Stats Overview */}
      <section className={styles.statsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Обобщение на прогреса</h2>
          <p className={styles.sectionDescription}>
            Ето бърз преглед на твоето развитие. Продължавай напред!
          </p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💪</div>
            <div className={styles.statValue}>{stats.totalWorkouts}</div>
            <div className={styles.statLabel}>Общо тренировки</div>
            <p className={styles.statText}>
              Брой тренировки, които си записал/а от началото
            </p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔥</div>
            <div className={styles.statValue}>{stats.streak}</div>
            <div className={styles.statLabel}>Поредица (дни)</div>
            <p className={styles.statText}>
              Последователни дни с поне една записана активност
            </p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statValue}>{stats.level}</div>
            <div className={styles.statLabel}>Текущо ниво</div>
            <p className={styles.statText}>
              Повишаваш ниво на всеки 5 тренировки. Продължавай!
            </p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statValue}>{stats.totalSets}</div>
            <div className={styles.statLabel}>Общо серии</div>
            <p className={styles.statText}>
              Сумирани серии от всички упражнения
            </p>
          </div>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className={styles.mainGrid}>
        {/* Weekly Activity */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Седмична активност</h2>
          <p className={styles.sectionText}>
            Постоянството е ключът към резултатите. Виж колко пъти си тренирал/а през седмицата
            и поддържай инерцията си, за да напредваш.
          </p>

          <div className={styles.activityChart}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day, i) => (
              <div key={day} className={styles.activityBar}>
                <div className={styles.barContainer}>
                  <div
                    className={styles.barFill}
                    style={{ height: `${Math.max(5, stats.weeklyActivity[i] * 20)}%` }}
                  >
                    <span className={styles.barValue}>{stats.weeklyActivity[i]}</span>
                  </div>
                </div>
                <div className={styles.barLabel}>{day}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Workouts */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последни тренировки</h2>
          <p className={styles.sectionText}>
            Прегледай последните си тренировки и остани мотивиран/а, като следиш напредъка си.
            Всяка сесия има значение.
          </p>

          <div className={styles.workoutsList}>
            {stats.recentWorkouts.length > 0 ? (
              stats.recentWorkouts.map((workout) => (
                <div key={workout.id} className={styles.workoutItem}>
                  <div className={styles.workoutIcon}>🏋️</div>
                  <div className={styles.workoutInfo}>
                    <div className={styles.workoutName}>{workout.name}</div>
                    <div className={styles.workoutDate}>
                      {new Date(workout.created_at).toLocaleDateString("bg-BG", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <p className={styles.emptyText}>
                  Все още нямаш записани тренировки. Започни още днес, като добавиш първата си тренировка!
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Какво можеш да правиш с Trainify</h2>
          <p className={styles.sectionDescription}>
            Trainify ти дава всичко необходимо за проследяване на прогреса — от запис на тренировки до следене на хранене.
            Ето как ти помагаме:
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📝</div>
            <h3 className={styles.featureTitle}>Записвай тренировки</h3>
            <p className={styles.featureText}>
              Записвай всяко упражнение, серия, повторения и тежест. Поддържай детайлен дневник,
              за да следиш силата и издръжливостта си с времето.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Следи прогреса</h3>
            <p className={styles.featureText}>
              Наблюдавай развитието си с ясни статистики. Виж общ брой тренировки, активни поредици и тенденции,
              за да останеш мотивиран/а и фокусиран/а.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🍎</div>
            <h3 className={styles.featureTitle}>Управлявай храненето</h3>
            <p className={styles.featureText}>
              Следи дневния прием на калории и макронутриенти. Виж хранителните стойности и взимай по-информирани решения,
              в подкрепа на целите си.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🏆</div>
            <h3 className={styles.featureTitle}>Система за нива</h3>
            <p className={styles.featureText}>
              Остани мотивиран/а с геймифициран прогрес. Записвай тренировки, повишавай ниво
              и отбелязвай важните си моменти по пътя.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💬</div>
            <h3 className={styles.featureTitle}>Социален поток</h3>
            <p className={styles.featureText}>
              Споделяй тренировки, вдъхновявай се от другите и общувай с хора със сходни интереси.
              Харесвай и коментирай, за да създаваш връзки.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Библиотека с упражнения</h3>
            <p className={styles.featureText}>
              Достъп до богата база упражнения с полезни насоки. Научи правилната техника,
              за да максимизираш резултатите и да намалиш риска от травми.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Готов/а ли си да започнеш?</h2>
        <p className={styles.sectionDescription}>
          Направи следващата стъпка към целите си — независимо дали ще записваш тренировка,
          ще преглеждаш потока или ще разглеждаш упражненията.
        </p>

        <div className={styles.actions}>
          <button className={styles.actionPrimary} onClick={() => setPage("log")}>
            Запиши нова тренировка
          </button>
          <button className={styles.actionSecondary} onClick={() => setPage("workouts")}>
            Виж потока с тренировки
          </button>
          <button className={styles.actionSecondary} onClick={() => setPage("exercises")}>
            Разгледай упражнения
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;