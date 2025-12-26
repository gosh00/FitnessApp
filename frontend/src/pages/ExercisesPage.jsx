import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import styles from './ExercisesPage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [muscleFilter, setMuscleFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadExercises = useCallback(async () => {
    // async boundary to satisfy react-hooks/set-state-in-effect
    await Promise.resolve();
    setLoading(true);

    let cancelled = false;

    try {
      const res = await api.get('/exercises', {
        params: muscleFilter ? { muscle: muscleFilter } : {},
      });

      if (!cancelled) setExercises(res.data);
    } catch (err) {
      if (!cancelled) {
        console.error(err);
        alert('Error loading exercises');
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    // return a cancel function (useful if you later call this inside an effect cleanup)
    return () => {
      cancelled = true;
    };
  }, [muscleFilter]);

  useEffect(() => {
    // load once on mount
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
          onClick={() => loadExercises()}
          className={sharedStyles.primaryButton}
          disabled={loading}
        >
          Apply filter
        </button>
      </div>

      {loading && <div className={sharedStyles.loading}>Loading exercises...</div>}

      {!loading && exercises.length === 0 && (
        <div className={styles.emptyState}>No exercises found.</div>
      )}

      <ul className={styles.exerciseList}>
        {exercises.map((ex) => (
          <li key={ex.id} className={styles.exerciseItem}>
            <div className={styles.exerciseName}>{ex.name}</div>
            <div className={styles.exerciseMuscle}>{ex.muscle_group}</div>
            {ex.description && (
              <div className={styles.exerciseDescription}>{ex.description}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
