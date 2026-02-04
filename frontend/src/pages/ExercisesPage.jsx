import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./ExercisesPage.module.css";
import sharedStyles from "../styles/shared.module.css";

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

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);

  const [nameFilter, setNameFilter] = useState("");     // ✅ NEW
  const [muscleFilter, setMuscleFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const [selected, setSelected] = useState(null); // ✅ modal

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      let query = supabase
        .from("Exercises")
        .select("id, name, muscle_group, description, image_url, video_url")
        .order("name", { ascending: true });

      // ✅ filter by name (case-insensitive, partial match)
      if (nameFilter.trim()) {
        query = query.ilike("name", `%${nameFilter.trim()}%`);
      }

      // ✅ filter by muscle group (case-insensitive, partial match)
      if (muscleFilter.trim()) {
        query = query.ilike("muscle_group", `%${muscleFilter.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setExercises(data ?? []);
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Error loading exercises");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [nameFilter, muscleFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Exercises Library</h2>

      {/* ✅ Filters */}
      <div className={styles.filterSection}>
        <input
          placeholder="Filter by name (e.g. bench, squat)"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className={`${sharedStyles.input} ${styles.filterInput}`}
        />

        <input
          placeholder="Filter by muscle (e.g. chest, legs)"
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          className={`${sharedStyles.input} ${styles.filterInput}`}
        />

        <button
          type="button"
          onClick={loadExercises}
          className={sharedStyles.primaryButton}
          disabled={loading}
        >
          Apply filter
        </button>
      </div>

      {/* (Optional) Admin form - show it always, or later limit by email */}

      {pageError && <div style={{ color: "red", marginTop: 8 }}>{pageError}</div>}

      {loading && <div className={sharedStyles.loading}>Loading exercises...</div>}

      {!loading && exercises.length === 0 && (
        <div className={styles.emptyState}>No exercises found.</div>
      )}

      {/* ✅ list */}
      <ul className={styles.exerciseList}>
        {exercises.map((ex) => (
          <li
            key={ex.id}
            className={styles.exerciseItem}
            onClick={() => setSelected(ex)}
            style={{ cursor: "pointer" }}
            title="Click for details"
          >
            <div className={styles.exerciseName}>{ex.name}</div>
            <div className={styles.exerciseMuscle}>{ex.muscle_group}</div>

            {ex.image_url && (
              <img
                src={ex.image_url}
                alt={ex.name}
                style={{ maxWidth: 220, borderRadius: 10, marginTop: 8 }}
              />
            )}

            {ex.description && (
              <div className={styles.exerciseDescription}>{ex.description}</div>
            )}

            <div style={{ opacity: 0.7, marginTop: 8, fontSize: 12 }}>
              Click to open video & details
            </div>
          </li>
        ))}
      </ul>

      {/* ✅ MODAL */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            }}
          >
            {/* header */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>{selected.name}</h2>
                <div style={{ opacity: 0.75, marginTop: 6 }}>
                  {selected.muscle_group || "—"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "white",
                  padding: "8px 10px",
                  cursor: "pointer",
                  height: 38,
                }}
              >
                ✕
              </button>
            </div>

            {/* content */}
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {/* image */}
              <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.name}
                    style={{ width: "100%", height: 320, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      height: 320,
                      background: "#f5f5f5",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              {/* video */}
              <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
                {selected.video_url ? (
                  isYouTube(selected.video_url) ? (
                    <iframe
                      title="exercise-video"
                      src={toYouTubeEmbed(selected.video_url) || undefined}
                      style={{ width: "100%", height: 320, border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div style={{ padding: 12 }}>
                      Video link is not YouTube. Paste a YouTube link in <b>video_url</b>.
                    </div>
                  )
                ) : (
                  <div
                    style={{
                      height: 320,
                      background: "#f5f5f5",
                      display: "grid",
                      placeItems: "center",
                      padding: 12,
                      textAlign: "center",
                    }}
                  >
                    No video yet.
                    <br />
                    Add a YouTube link to <b>video_url</b> in Supabase.
                  </div>
                )}
              </div>
            </div>

            {/* description */}
            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Description</h3>
              <div style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selected.description || "Няма описание."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
