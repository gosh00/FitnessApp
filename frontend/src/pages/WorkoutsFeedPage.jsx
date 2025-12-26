import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import api from '../api';
import styles from './WorkoutsFeedPage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function WorkoutsFeedPage({ currentUser }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likedByMe, setLikedByMe] = useState({});
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [exerciseMap, setExerciseMap] = useState({});
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/workouts', {
          params: { viewer_id: currentUser.appUserId },
        });
        setWorkouts(res.data || []);
      } catch (err) {
        console.error(err);
        alert('Error loading workouts');
      }
      setLoading(false);
    };

    loadWorkouts();
  }, [currentUser.appUserId]);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const res = await api.get('/exercises');
        const list = res.data || [];
        const map = {};
        list.forEach((ex) => {
          map[ex.id] = { name: ex.name, muscle_group: ex.muscle_group };
        });
        setExerciseMap(map);
      } catch (err) {
        console.error('Error loading exercises map:', err);
      }
    };

    loadExercises();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('workouts-live')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Workouts',
        },
        (payload) => {
          const updated = payload.new;
          if (!updated?.id) return;

          setWorkouts((prev) =>
            prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLikeWorkout = async (workoutId) => {
    try {
      setLikedByMe((prev) => ({ ...prev, [workoutId]: !prev[workoutId] }));

      const res = await api.post(`/workouts/${workoutId}/like`, {
        user_id: currentUser.appUserId,
      });

      const { likes_count, liked } = res.data;

      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId ? { ...w, likes_count: likes_count } : w
        )
      );
      if (typeof liked === 'boolean') {
        setLikedByMe((prev) => ({ ...prev, [workoutId]: liked }));
      }
    } catch (err) {
      console.error(err);
      alert('Error liking workout');
    }
  };

  const loadCommentsForWorkout = async (workoutId) => {
    try {
      const res = await api.get(`/workouts/${workoutId}/comments`);
      setComments((prev) => ({ ...prev, [workoutId]: res.data }));
    } catch (err) {
      console.error(err);
      alert('Error loading comments');
    }
  };

  const handleAddComment = async (workoutId) => {
    const text = commentInputs[workoutId];
    if (!text || !text.trim()) {
      alert('Enter a comment');
      return;
    }
    try {
      const res = await api.post(`/workouts/${workoutId}/comments`, {
        user_id: currentUser.appUserId,
        content: text.trim(),
      });

      setCommentInputs((prev) => ({ ...prev, [workoutId]: '' }));
      setComments((prev) => ({
        ...prev,
        [workoutId]: [...(prev[workoutId] || []), res.data],
      }));
    } catch (err) {
      console.error(err);
      alert('Error adding comment');
    }
  };

  const renderDetailsModal = () => {
    if (!selectedWorkout) return null;

    const exList =
      selectedWorkout.data && Array.isArray(selectedWorkout.data.exercises)
        ? selectedWorkout.data.exercises
        : [];

    return (
      <div className={styles.modal} onClick={() => setSelectedWorkout(null)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>{selectedWorkout.name}</h3>
            <button onClick={() => setSelectedWorkout(null)} className={styles.closeButton}>
              Close
            </button>
          </div>

          <div className={styles.workoutMeta}>
            {selectedWorkout.is_public ? 'Public' : 'Private'} ·{' '}
            {new Date(selectedWorkout.created_at).toLocaleString()}
          </div>

          {exList.length === 0 && <p>No exercises saved.</p>}

          {exList.map((ex, idx) => {
            const info = exerciseMap[ex.exercise_id] || {};
            return (
              <div key={idx} className={styles.exerciseDetail}>
                <div className={styles.exerciseName}>
                  {info.name || `Exercise #${ex.exercise_id}`}{' '}
                  {info.muscle_group ? `(${info.muscle_group})` : ''}
                </div>

                {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                  <ul className={styles.setsList}>
                    {ex.sets.map((s, si) => (
                      <li key={si} className={styles.setItem}>
                        Set {si + 1}: {s.reps} reps @ {s.weight} {s.unit || 'kg'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No sets.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Workouts Feed</h2>

      {loading && <div className={sharedStyles.loading}>Loading workouts...</div>}
      {!loading && workouts.length === 0 && (
        <div className={styles.emptyState}>No workouts found.</div>
      )}

      {workouts.map((w) => (
        <div key={w.id} className={styles.workoutCard}>
          <div className={styles.workoutHeader}>
            <div className={styles.workoutName}>{w.name}</div>
            <div className={styles.workoutMeta}>
              {w.is_public ? 'Public' : 'Private'} ·{' '}
              {new Date(w.created_at).toLocaleString()}
            </div>
          </div>

          <div className={styles.likesSection}>
            ❤️ <strong>{w.likes_count ?? 0}</strong> likes
          </div>

          <div className={styles.workoutInfo}>
            {Array.isArray(w.data?.exercises)
              ? `${w.data.exercises.length} exercise(s)`
              : ''}
          </div>

          <div className={styles.actionButtons}>
            <button onClick={() => setSelectedWorkout(w)} className={sharedStyles.secondaryButton}>
              View details
            </button>

            <button onClick={() => handleLikeWorkout(w.id)} className={sharedStyles.secondaryButton}>
              {likedByMe[w.id] ? '💔 Unlike' : '👍 Like'}
            </button>

            <button onClick={() => loadCommentsForWorkout(w.id)} className={sharedStyles.secondaryButton}>
              Load comments
            </button>
          </div>

          {comments[w.id] && comments[w.id].length > 0 && (
            <div className={styles.commentSection}>
              {comments[w.id].map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <span className={styles.commentAuthor}>User {c.user_id.slice(0, 4)}…:</span>{' '}
                  {c.content}
                </div>
              ))}
            </div>
          )}

          <div className={styles.commentInput}>
            <input
              className={`${sharedStyles.input} ${styles.commentInputField}`}
              placeholder="Add a comment..."
              value={commentInputs[w.id] || ''}
              onChange={(e) =>
                setCommentInputs((prev) => ({
                  ...prev,
                  [w.id]: e.target.value,
                }))
              }
            />
            <button
              type="button"
              onClick={() => handleAddComment(w.id)}
              className={sharedStyles.secondaryButton}
            >
              Send
            </button>
          </div>
        </div>
      ))}

      {renderDetailsModal()}
    </div>
  );
}
