import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./MyWorkoutsPage.module.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL}/api`;

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("bg-BG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function safeText(value, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function extractExercisesFromWorkoutData(data) {
  if (!data) return [];

  if (Array.isArray(data)) return data;

  if (Array.isArray(data.exercises)) return data.exercises;

  if (Array.isArray(data.items)) return data.items;

  return [];
}

function normalizeExercise(ex, index) {
  const exerciseName =
    safeText(ex?.name) ||
    safeText(ex?.exercise_name) ||
    safeText(ex?.title) ||
    `Упражнение ${index + 1}`;

  let setsCount = 0;
  let totalReps = 0;
  let maxWeight = 0;
  let unit = "кг";

  if (Array.isArray(ex?.sets)) {
    setsCount = ex.sets.length;

    for (const setItem of ex.sets) {
      const reps = safeNumber(setItem?.reps);
      const weight = safeNumber(setItem?.weight);

      totalReps += reps;
      if (weight > maxWeight) maxWeight = weight;

      if (typeof setItem?.unit === "string" && setItem.unit.trim()) {
        unit = setItem.unit.trim();
      }
    }
  } else {
    setsCount = safeNumber(ex?.sets);
    totalReps = safeNumber(ex?.reps);
    maxWeight = safeNumber(ex?.weight);

    if (typeof ex?.unit === "string" && ex.unit.trim()) {
      unit = ex.unit.trim();
    }
  }

  return {
    name: exerciseName,
    setsCount,
    totalReps,
    maxWeight,
    unit,
  };
}

function calculateWorkoutStats(workout) {
  const exercises = extractExercisesFromWorkoutData(workout.data);

  let totalExercises = exercises.length;
  let totalSets = 0;
  let totalVolume = 0;

  exercises.forEach((ex, index) => {
    const normalized = normalizeExercise(ex, index);

    totalSets += normalized.setsCount;
    totalVolume += normalized.totalReps * normalized.maxWeight;
  });

  return {
    totalExercises,
    totalSets,
    totalVolume,
  };
}

export default function MyWorkoutsPage() {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [publishingId, setPublishingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadMyWorkouts();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data?.session?.access_token) {
      throw new Error("Липсва активна потребителска сесия.");
    }

    return data.session.access_token;
  }

  async function request(path, options = {}) {
    const token = await getAccessToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Възникна грешка.");
    }

    return data;
  }

  async function loadMyWorkouts() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await request("/workouts/mine");
      setWorkouts(result.workouts || []);
    } catch (error) {
      setErrorMessage(error.message || "Неуспешно зареждане на тренировките.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(workoutId) {
    try {
      setPublishingId(workoutId);
      setErrorMessage("");

      const result = await request(`/workouts/${workoutId}/publish`, {
        method: "PATCH",
      });

      setWorkouts((prev) =>
        prev.map((item) => (item.id === workoutId ? result.workout : item))
      );

      setSuccessMessage("Тренировката беше публикувана успешно.");
    } catch (error) {
      setErrorMessage(error.message || "Неуспешно публикуване.");
    } finally {
      setPublishingId(null);
    }
  }

  const filteredWorkouts = useMemo(() => {
    if (filter === "public") {
      return workouts.filter((w) => w.is_public === true);
    }

    if (filter === "private") {
      return workouts.filter((w) => !w.is_public);
    }

    return workouts;
  }, [workouts, filter]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <span className={styles.kicker}>Trainify • Личен архив</span>
          <h1 className={styles.title}>Моите тренировки</h1>
          <p className={styles.subtitle}>
            Тук можеш да преглеждаш предишните си тренировки, включително тези,
            които не са публикувани в потока.
          </p>
        </div>
      </div>

      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
          onClick={() => setFilter("all")}
        >
          Всички
        </button>

        <button
          className={`${styles.filterBtn} ${filter === "public" ? styles.filterBtnActive : ""}`}
          onClick={() => setFilter("public")}
        >
          Публикувани
        </button>

        <button
          className={`${styles.filterBtn} ${filter === "private" ? styles.filterBtnActive : ""}`}
          onClick={() => setFilter("private")}
        >
          Непубликувани
        </button>
      </div>

      {loading ? (
        <div className={styles.stateCard}>Зареждане на тренировките...</div>
      ) : filteredWorkouts.length === 0 ? (
        <div className={styles.stateCard}>Няма налични тренировки за този филтър.</div>
      ) : (
        <div className={styles.grid}>
          {filteredWorkouts.map((workout) => {
            const stats = calculateWorkoutStats(workout);
            const exercises = extractExercisesFromWorkoutData(workout.data);

            return (
              <div key={workout.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>
                      {safeText(workout.name, "Тренировка без име")}
                    </h2>
                    <div className={styles.cardDate}>
                      {formatDateTime(workout.created_at)}
                    </div>
                  </div>

                  <span
                    className={`${styles.badge} ${
                      workout.is_public ? styles.badgePublic : styles.badgePrivate
                    }`}
                  >
                    {workout.is_public ? "Публикувана" : "Непубликувана"}
                  </span>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Упражнения</span>
                    <span className={styles.statValue}>{stats.totalExercises}</span>
                  </div>

                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Серии</span>
                    <span className={styles.statValue}>{stats.totalSets}</span>
                  </div>

                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Обем</span>
                    <span className={styles.statValue}>{stats.totalVolume}</span>
                  </div>
                </div>

                <div className={styles.exerciseList}>
                  {exercises.length === 0 ? (
                    <div className={styles.emptyText}>
                      Няма данни за упражнения в тази тренировка.
                    </div>
                  ) : (
                    exercises.map((ex, index) => {
                      const item = normalizeExercise(ex, index);

                      return (
                        <div key={`${workout.id}-${index}`} className={styles.exerciseItem}>
                          <div className={styles.exerciseName}>{item.name}</div>
                          <div className={styles.exerciseMeta}>
                            {item.setsCount} серии • {item.totalReps} повторения • {item.maxWeight}{" "}
                            {item.unit}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {!workout.is_public && (
                  <div className={styles.actions}>
                    <button
                      className={styles.publishButton}
                      disabled={publishingId === workout.id}
                      onClick={() => handlePublish(workout.id)}
                    >
                      {publishingId === workout.id
                        ? "Публикуване..."
                        : "Публикувай в потока"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}