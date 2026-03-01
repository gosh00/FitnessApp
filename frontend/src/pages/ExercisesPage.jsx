import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./ExercisesPage.module.css";

// ---- helpers for YouTube ----
function isYouTube(url = "") {
  return /youtube\.com|youtu\.be/.test(url);
}

function toYouTubeEmbed(url = "") {
  const short = url.match(/youtu\.be\/([^?]+)/)?.[1];
  const long = url.match(/[?&]v=([^&]+)/)?.[1];
  const id = short || long;
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

const MAX_VISIBLE = 12;

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);

  const [nameFilter, setNameFilter] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const [selected, setSelected] = useState(null);

  // load exercises
  const loadExercises = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      let query = supabase
        .from("Exercises")
        .select("id, name, muscle_group, description, image_url, video_url")
        .order("name", { ascending: true });

      if (nameFilter.trim()) {
        query = query.ilike("name", `%${nameFilter.trim()}%`);
      }

      if (muscleFilter.trim()) {
        query = query.ilike("muscle_group", `%${muscleFilter.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setExercises(data ?? []);
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Грешка при зареждане на упражненията.");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [nameFilter, muscleFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const visibleExercises = useMemo(() => {
    return exercises.slice(0, MAX_VISIBLE);
  }, [exercises]);

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.inner}>
          <h2 className={styles.title}>Библиотека с упражнения</h2>

          {/* Filters */}
          <div className={styles.filterSection}>
            <input
              placeholder="Филтър по име (напр. лежанка, клек)"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className={styles.filterInput}
            />

            <input
              placeholder="Филтър по мускул (напр. гърди, крака)"
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className={styles.filterInput}
            />

            <button
              type="button"
              onClick={loadExercises}
              className={styles.applyButton}
              disabled={loading}
            >
              Приложи филтъра
            </button>
          </div>

          {pageError && <div className={styles.error}>{pageError}</div>}

          {loading && <div className={styles.loading}>Зареждане на упражнения…</div>}

          {!loading && exercises.length === 0 && (
            <div className={styles.emptyState}>Няма намерени упражнения.</div>
          )}

          {/* Exercises list */}
          <ul className={styles.exerciseList}>
            {visibleExercises.map((ex) => (
              <li
                key={ex.id}
                className={styles.exerciseItem}
                onClick={() => setSelected(ex)}
              >
                <div className={styles.exerciseTop}>
                  <div>
                    <div className={styles.exerciseName}>{ex.name}</div>
                    <div className={styles.exerciseMuscle}>{ex.muscle_group}</div>
                  </div>

                  <div className={styles.openHint}>Детайли ▸</div>
                </div>

                {ex.image_url && (
                  <img
                    src={ex.image_url}
                    alt={ex.name}
                    className={styles.exerciseImg}
                  />
                )}

                {ex.description && (
                  <div className={styles.exerciseDescription}>{ex.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* MODAL DARK VERSION */}
      {selected && (
        <div onClick={() => setSelected(null)} className={styles.modalOverlay}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.modalCard}
          >
            {/* header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{selected.name}</h2>
                <div className={styles.modalMuscle}>
                  {selected.muscle_group || "—"}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                className={styles.modalClose}
                aria-label="Затвори"
              >
                ✕
              </button>
            </div>

            {/* content */}
            <div className={styles.modalContent}>
              {/* image */}
              <div className={styles.modalImageBox}>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.name}
                    className={styles.modalImage}
                  />
                ) : (
                  <div className={styles.modalPlaceholder}>Няма изображение</div>
                )}
              </div>

              {/* video */}
              <div className={styles.modalVideoBox}>
                {selected.video_url ? (
                  isYouTube(selected.video_url) ? (
                    <iframe
                      title="exercise-video"
                      src={toYouTubeEmbed(selected.video_url)}
                      className={styles.modalVideo}
                      allowFullScreen
                    />
                  ) : (
                    <div className={styles.modalPlaceholder}>
                      Невалиден видео линк
                    </div>
                  )
                ) : (
                  <div className={styles.modalPlaceholder}>Няма видео</div>
                )}
              </div>
            </div>

            {/* description */}
            <div className={styles.modalDescription}>
              <h3>Описание</h3>
              <div>{selected.description || "Няма описание."}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}