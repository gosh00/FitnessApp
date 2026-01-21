import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // ако е в src/lib -> "../lib/supabaseClient"
import styles from "./ExercisesPage.module.css";
import sharedStyles from "../styles/shared.module.css";

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [muscleFilter, setMuscleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      let query = supabase
        .from("Exercises")
        .select("id, name, muscle_group, description, image_url")
        .order("name", { ascending: true });

      if (muscleFilter.trim()) {
        // case-insensitive filter (partial match)
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
  }, [muscleFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Exercises Library</h2>

      <div className={styles.filterSection}>
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

      {pageError && <div style={{ color: "red", marginTop: 8 }}>{pageError}</div>}

      {loading && <div className={sharedStyles.loading}>Loading exercises...</div>}

      {!loading && exercises.length === 0 && (
        <div className={styles.emptyState}>No exercises found.</div>
      )}

      <ul className={styles.exerciseList}>
        {exercises.map((ex) => (
          <li key={ex.id} className={styles.exerciseItem}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
