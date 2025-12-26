import { useEffect, useState } from 'react';
import api from '../api';
import styles from './LogWorkoutPage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function LogWorkoutPage({ currentUser }) {
  const [exercises, setExercises] = useState([]);
  const [workoutName, setWorkoutName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [exerciseBlocks, setExerciseBlocks] = useState([
    {
      exercise_id: '',
      sets: [{ reps: '', weight: '', unit: 'kg' }],
    },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const res = await api.get('/exercises');
        setExercises(res.data);
      } catch (err) {
        console.error(err);
        alert('Error loading exercises');
      }
    };
    loadExercises();
  }, []);

  const addExerciseBlock = () => {
    setExerciseBlocks((prev) => [
      ...prev,
      { exercise_id: '', sets: [{ reps: '', weight: '', unit: 'kg' }] },
    ]);
  };

  const removeExerciseBlock = (index) => {
    setExerciseBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const changeExerciseId = (index, value) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, exercise_id: value } : block
      )
    );
  };

  const addSetToBlock = (blockIndex) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? {
              ...block,
              sets: [...block.sets, { reps: '', weight: '', unit: 'kg' }],
            }
          : block
      )
    );
  };

  const removeSetFromBlock = (blockIndex, setIndex) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? {
              ...block,
              sets: block.sets.filter((_, si) => si !== setIndex),
            }
          : block
      )
    );
  };

  const changeSetField = (blockIndex, setIndex, field, value) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? {
              ...block,
              sets: block.sets.map((set, si) =>
                si === setIndex ? { ...set, [field]: value } : set
              ),
            }
          : block
      )
    );
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      alert('Please enter a workout name');
      return;
    }

    const cleanedExercises = exerciseBlocks
      .filter((b) => b.exercise_id)
      .map((b) => ({
        exercise_id: Number(b.exercise_id),
        sets: b.sets
          .filter((s) => s.reps && s.weight)
          .map((s) => ({
            reps: Number(s.reps),
            weight: Number(s.weight),
            unit: s.unit,
          })),
      }))
      .filter((b) => b.sets.length > 0);

    if (cleanedExercises.length === 0) {
      alert('Add at least one exercise with one set');
      return;
    }

    setSaving(true);
    try {
      await api.post('/workouts', {
        user_id: currentUser.appUserId,
        name: workoutName.trim(),
        exercises: cleanedExercises,
        is_public: isPublic,
      });

      alert('Workout saved!');

      setWorkoutName('');
      setIsPublic(false);
      setExerciseBlocks([
        {
          exercise_id: '',
          sets: [{ reps: '', weight: '', unit: 'kg' }],
        },
      ]);
    } catch (err) {
      console.error(err);
      alert('Error saving workout');
    }
    setSaving(false);
  };

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Create Workout</h2>

      <div className={styles.workoutHeader}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Workout name</label>
          <input
            className={sharedStyles.input}
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g. Push day, Leg day, Full body"
          />
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this workout public (visible to other users)
        </label>
      </div>

      {exerciseBlocks.map((block, i) => (
        <div key={i} className={styles.exerciseBlock}>
          <div className={styles.exerciseHeader}>
            <select
              value={block.exercise_id}
              onChange={(e) => changeExerciseId(i, e.target.value)}
              className={`${sharedStyles.select} ${styles.exerciseSelect}`}
            >
              <option value="">-- choose exercise --</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscle_group})
                </option>
              ))}
            </select>
            {exerciseBlocks.length > 1 && (
              <button
                type="button"
                onClick={() => removeExerciseBlock(i)}
                className={styles.removeButton}
              >
                Remove exercise
              </button>
            )}
          </div>

          <div>
            {block.sets.map((set, si) => (
              <div key={si} className={styles.setRow}>
                <span className={styles.setLabel}>Set {si + 1}:</span>
                <input
                  type="number"
                  placeholder="Reps"
                  className={`${sharedStyles.input} ${styles.smallInput}`}
                  value={set.reps}
                  onChange={(e) =>
                    changeSetField(i, si, 'reps', e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="Weight"
                  className={`${sharedStyles.input} ${styles.smallInput}`}
                  value={set.weight}
                  onChange={(e) =>
                    changeSetField(i, si, 'weight', e.target.value)
                  }
                />
                <select
                  value={set.unit}
                  onChange={(e) =>
                    changeSetField(i, si, 'unit', e.target.value)
                  }
                  className={`${sharedStyles.select} ${styles.smallSelect}`}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>

                {block.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSetFromBlock(i, si)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addSetToBlock(i)}
              className={styles.addButton}
            >
              + Add set
            </button>
          </div>
        </div>
      ))}

      <div className={styles.actionButtons}>
        <button type="button" onClick={addExerciseBlock} className={sharedStyles.secondaryButton}>
          + Add exercise
        </button>
        <button type="button" onClick={handleSaveWorkout} disabled={saving} className={sharedStyles.primaryButton}>
          {saving ? 'Saving...' : 'Save workout'}
        </button>
      </div>
    </div>
  );
}
