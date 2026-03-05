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

function bgMuscle(m = "") {
  const v = (m || "").toLowerCase().trim();
  const map = {
    abdominals: "корем",
    chest: "гърди",
    shoulders: "рамо",
    biceps: "бицепс",
    triceps: "трицепс",
    lats: "гръб",
    "middle back": "гръб",
    "lower back": "кръст",
    quadriceps: "крака",
    hamstrings: "задно бедро",
    glutes: "седалище",
    calves: "прасци",
    adductors: "аддуктори",
    abductors: "абдуктори",
    traps: "трапец",
    forearms: "предмишници",
  };
  return map[v] || m || "—";
}

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

  // ESC to close modal + lock scroll
  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  const visibleExercises = useMemo(() => exercises.slice(0, MAX_VISIBLE), [exercises]);

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.inner}>
          <h2 className={styles.title}>Библиотека с упражнения</h2>

          {/* Filters */}
          <div className={styles.filterSection}>
            <input
              placeholder="Търси по име (напр. лежанка, клек...)"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className={styles.filterInput}
            />

            <input
              placeholder="Търси по мускул (напр. гърди, крака...)"
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className={styles.filterInput}
            />

            <button type="button" onClick={loadExercises} className={styles.applyButton} disabled={loading}>
              {loading ? "Зареждане…" : "Приложи"}
            </button>
          </div>

          {pageError && <div className={styles.error}>{pageError}</div>}
          {loading && <div className={styles.loading}>Зареждане на упражнения…</div>}

          {!loading && exercises.length === 0 && <div className={styles.emptyState}>Няма намерени упражнения.</div>}

          {/* Exercises list */}
          <ul className={styles.exerciseList}>
            {visibleExercises.map((ex) => (
              <li key={ex.id} className={styles.exerciseItem} onClick={() => setSelected(ex)}>
                <div className={styles.exerciseTop}>
                  <div>
                    <div className={styles.exerciseName}>{ex.name}</div>
                    <div className={styles.exerciseMuscle}>{bgMuscle(ex.muscle_group)}</div>
                  </div>
                  <div className={styles.openHint}>Детайли ▸</div>
                </div>

                {ex.image_url && <img src={ex.image_url} alt={ex.name} className={styles.exerciseImg} />}

                {ex.description && <div className={styles.exerciseDescription}>{ex.description}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ✅ MODAL (fixed layout) */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <h2 className={styles.modalTitle}>{selected.name}</h2>
                <div className={styles.modalPills}>
                  <span className={styles.pill}>{bgMuscle(selected.muscle_group)}</span>
                  <span className={styles.pill}>
                    {selected.video_url ? (isYouTube(selected.video_url) ? "Видео: YouTube" : "Видео: линк") : "Няма видео"}
                  </span>
                </div>
              </div>

              <button onClick={() => setSelected(null)} className={styles.modalClose} aria-label="Затвори">
                ✕
              </button>
            </div>

            {/* body */}
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                {/* left: media */}
                <div className={styles.mediaCol}>
                  <div className={styles.mediaCard}>
                    {selected.image_url ? (
                      <img src={selected.image_url} alt={selected.name} className={styles.modalImage} />
                    ) : (
                      <div className={styles.modalPlaceholder}>Няма изображение</div>
                    )}
                  </div>

                  <div className={styles.mediaCard}>
                    {selected.video_url ? (
                      isYouTube(selected.video_url) ? (
                        <iframe
                          title="exercise-video"
                          src={toYouTubeEmbed(selected.video_url)}
                          className={styles.modalVideo}
                          allowFullScreen
                        />
                      ) : (
                        <div className={styles.modalPlaceholder}>Невалиден видео линк</div>
                      )
                    ) : (
                      <div className={styles.modalPlaceholder}>Няма видео</div>
                    )}
                  </div>
                </div>

                {/* right: description */}
                <div className={styles.infoCol}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoTitle}>Описание</div>
                    <div className={styles.modalText}>
                      {selected.description ? selected.description : "Няма описание."}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.modalOk} onClick={() => setSelected(null)}>
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}