// src/App.jsx
import { useEffect, useState } from 'react';
import api from './api';
import { supabase } from './supabaseClient';

// ================= ROOT APP =================

function App() {
  const [page, setPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // If not logged in -> show only auth
  if (!currentUser) {
    return (
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 20,
          fontFamily: 'sans-serif',
        }}
      >
        <h1>Fitness App</h1>
        <AuthPage onLogin={setCurrentUser} />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 20,
        fontFamily: 'sans-serif',
      }}
    >
      <h1>Fitness App</h1>

      <div style={{ marginBottom: 10, fontSize: 14 }}>
        Logged in as <strong>{currentUser.displayName || currentUser.email}</strong>{' '}
        ({currentUser.role})
        <button onClick={handleLogout} style={{ marginLeft: 10 }}>
          Logout
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ marginBottom: 20 }}>
        <button onClick={() => setPage('home')}>Home</button>{' '}
        <button onClick={() => setPage('exercises')}>Exercises</button>{' '}
        <button onClick={() => setPage('log')}>Log Workout</button>{' '}
        <button onClick={() => setPage('workouts')}>Workouts</button>{' '}
        <button onClick={() => setPage('calories')}>Calorie Calculator</button>{' '}
        <button onClick={() => setPage('food')}>Food Calories</button>
      </nav>

      {page === 'home' && <HomePage />}
      {page === 'exercises' && <ExercisesPage />}
      {page === 'log' && <LogWorkoutPage currentUser={currentUser} />}
      {page === 'workouts' && <WorkoutsFeedPage currentUser={currentUser} />}
      {page === 'calories' && <CaloriePage />}
      {page === 'food' && <FoodCaloriePage />}
    </div>
  );
}

// ================= AUTH PAGE (LOGIN / SIGNUP) =================

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      let data, error;

      if (mode === 'signup') {
        const res = await supabase.auth.signUp({ email, password });
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        data = res.data;
        error = res.error;
      }

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setErrorMsg('No user returned from Supabase');
        setLoading(false);
        return;
      }

      // Ask backend to decide role (admin / user) based on email
      const resProfile = await api.post('/auth/sync', {
        auth_id: user.id,
        email: user.email,
      });

      const profile = resProfile.data;

      const mergedUser = {
        authId: user.id,
        email: user.email,
        appUserId: user.id, // use auth id as app id
        role: profile.role,
        displayName: profile.display_name,
      };

      onLogin(mergedUser);
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response && err.response.data) {
        const backendMsg =
          err.response.data.error || JSON.stringify(err.response.data);
        setErrorMsg(`Backend error: ${backendMsg}`);
      } else if (err.message) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unexpected error during auth');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          disabled={mode === 'login'}
        >
          Login
        </button>{' '}
        <button
          type="button"
          onClick={() => setMode('signup')}
          disabled={mode === 'signup'}
        >
          Sign up
        </button>
      </div>

      <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>Email: </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '70%' }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '70%' }}
          />
        </div>

        {errorMsg && (
          <div style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : mode === 'login'
            ? 'Login'
            : 'Sign up'}
        </button>
      </form>
    </div>
  );
}

// ================= HOME =================

function HomePage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        setStatus(res.data);
      } catch (err) {
        console.error(err);
        setStatus({ error: 'Backend not reachable' });
      }
    };
    checkHealth();
  }, []);

  return (
    <div>
      <h2>Home</h2>
      <p>This is your fitness app using Vite + Express + Supabase.</p>
      <h3>Backend status:</h3>
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}

// ================= EXERCISES PAGE =================

function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [muscleFilter, setMuscleFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exercises', {
        params: muscleFilter ? { muscle: muscleFilter } : {},
      });
      setExercises(res.data);
    } catch (err) {
      console.error(err);
      alert('Error loading exercises');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2>Exercises</h2>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Filter by muscle (e.g. chest, legs)"
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
        />
        <button onClick={loadExercises} style={{ marginLeft: 8 }}>
          Apply filter
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && exercises.length === 0 && <p>No exercises found.</p>}

      <ul>
        {exercises.map((ex) => (
          <li key={ex.id} style={{ marginBottom: 8 }}>
            <strong>{ex.name}</strong> – {ex.muscle_group}
            {ex.description && <div>{ex.description}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================= LOG WORKOUT PAGE (CREATE ONLY) =================

function LogWorkoutPage({ currentUser }) {
  const [exercises, setExercises] = useState([]);

  const [workoutName, setWorkoutName] = useState('');
  const [isPublic, setIsPublic] = useState(false); // public / private

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

  // ----- Modify workout builder -----

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

  // ----- Save workout -----

  const handleSaveWorkout = async (e) => {
    e.preventDefault();

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

      // Reset form
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
    <div>
      <h2>Create Workout</h2>

      <form onSubmit={handleSaveWorkout} style={{ marginBottom: 30 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Workout name: </label>
          <input
            style={{ width: '60%' }}
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g. Push day, Leg day, Full body"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Make this workout public (visible to other users)
          </label>
        </div>

        {exerciseBlocks.map((block, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #ccc',
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <label>Exercise: </label>
              <select
                value={block.exercise_id}
                onChange={(e) => changeExerciseId(i, e.target.value)}
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
                  style={{ marginLeft: 8 }}
                >
                  Remove exercise
                </button>
              )}
            </div>

            {/* Sets */}
            <div>
              {block.sets.map((set, si) => (
                <div key={si} style={{ marginBottom: 4 }}>
                  <span>Set {si + 1}: </span>
                  <label>Reps </label>
                  <input
                    type="number"
                    style={{ width: 60 }}
                    value={set.reps}
                    onChange={(e) =>
                      changeSetField(i, si, 'reps', e.target.value)
                    }
                  />
                  <label style={{ marginLeft: 6 }}>Weight </label>
                  <input
                    type="number"
                    style={{ width: 80 }}
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
                    style={{ marginLeft: 4 }}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>

                  {block.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSetFromBlock(i, si)}
                      style={{ marginLeft: 8 }}
                    >
                      Remove set
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSetToBlock(i)}
                style={{ marginTop: 4 }}
              >
                + Add set
              </button>
            </div>
          </div>
        ))}

        <button type="button" onClick={addExerciseBlock}>
          + Add exercise
        </button>

        <div>
          <button type="submit" style={{ marginTop: 12 }} disabled={saving}>
            {saving ? 'Saving...' : 'Save workout'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================= WORKOUTS FEED PAGE (LIST + LIKES + COMMENTS + DETAILS) =================

function WorkoutsFeedPage({ currentUser }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);

  // comments[workoutId] = array of comments
  const [comments, setComments] = useState({});
  // commentInputs[workoutId] = current input text for that workout
  const [commentInputs, setCommentInputs] = useState({});

  // exerciseMap[id] = { name, muscle_group }
  const [exerciseMap, setExerciseMap] = useState({});

  // modal
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Load workouts (visible for viewer)
  useEffect(() => {
    const loadWorkouts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/workouts', {
          params: { viewer_id: currentUser.appUserId },
        });
        setWorkouts(res.data);
      } catch (err) {
        console.error(err);
        alert('Error loading workouts');
      }
      setLoading(false);
    };

    loadWorkouts();
  }, [currentUser.appUserId]);

  // Load all exercises once for names in the details modal
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
        console.error('Error loading exercises for map:', err);
      }
    };

    loadExercises();
  }, []);

  const handleLikeWorkout = async (workoutId) => {
    try {
      const res = await api.post(`/workouts/${workoutId}/like`, {
        user_id: currentUser.appUserId,
      });

      const newLikes = res.data.likes_count;

      // Update likes_count in state
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId ? { ...w, likes_count: newLikes } : w
        )
      );
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

      // Clear input
      setCommentInputs((prev) => ({ ...prev, [workoutId]: '' }));

      // Add comment to list
      setComments((prev) => ({
        ...prev,
        [workoutId]: [...(prev[workoutId] || []), res.data],
      }));
    } catch (err) {
      console.error(err);
      alert('Error adding comment');
    }
  };

  // Render modal with full workout details
  const renderDetailsModal = () => {
    if (!selectedWorkout) return null;

    const exList =
      selectedWorkout.data && Array.isArray(selectedWorkout.data.exercises)
        ? selectedWorkout.data.exercises
        : [];

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setSelectedWorkout(null)}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 8,
            maxWidth: 600,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>{selectedWorkout.name}</h3>
            <button onClick={() => setSelectedWorkout(null)}>X</button>
          </div>

          <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
            {selectedWorkout.is_public ? 'Public workout' : 'Private workout'} ·{' '}
            {new Date(selectedWorkout.created_at).toLocaleString()}
          </div>

          {exList.length === 0 && <p>No exercises saved in this workout.</p>}

          {exList.map((ex, idx) => {
            const info = exerciseMap[ex.exercise_id] || {};
            return (
              <div
                key={idx}
                style={{
                  borderTop: idx === 0 ? 'none' : '1px solid #eee',
                  paddingTop: idx === 0 ? 0 : 8,
                  marginTop: idx === 0 ? 0 : 8,
                }}
              >
                <strong>
                  {info.name || `Exercise #${ex.exercise_id}`}{' '}
                  {info.muscle_group ? `(${info.muscle_group})` : ''}
                </strong>

                {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                  <ul style={{ marginTop: 4 }}>
                    {ex.sets.map((s, si) => (
                      <li key={si} style={{ fontSize: 14 }}>
                        Set {si + 1}: {s.reps} reps @ {s.weight} {s.unit || 'kg'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, marginTop: 4 }}>No sets defined.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2>Workouts feed</h2>
      <p style={{ fontSize: 13, color: '#555' }}>
        You see your own workouts (public + private) and public workouts from other users.
      </p>

      {loading && <p>Loading workouts...</p>}
      {!loading && workouts.length === 0 && <p>No workouts found.</p>}

      {workouts.map((w) => (
        <div
          key={w.id}
          style={{
            border: '1px solid #ddd',
            padding: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{w.name}</strong>
            <span style={{ fontSize: 12 }}>
              {w.is_public ? 'Public' : 'Private'} ·{' '}
              {new Date(w.created_at).toLocaleString()}
            </span>
          </div>

          <div style={{ fontSize: 12, marginTop: 4 }}>
            {Array.isArray(w.data?.exercises)
              ? `${w.data.exercises.length} exercise(s)`
              : ''}
          </div>

          {/* Actions row: details + likes */}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedWorkout(w)}>View details</button>
            <button onClick={() => handleLikeWorkout(w.id)}>
              👍 Like ({w.likes_count ?? 0})
            </button>
          </div>

          {/* Comments */}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => loadCommentsForWorkout(w.id)}>
              Load comments
            </button>

            <div style={{ marginTop: 4 }}>
              {(comments[w.id] || []).map((c) => (
                <div
                  key={c.id}
                  style={{
                    fontSize: 13,
                    borderTop: '1px solid #eee',
                    paddingTop: 2,
                    marginTop: 2,
                  }}
                >
                  <strong>User {c.user_id.slice(0, 4)}…:</strong> {c.content}
                  <span style={{ fontSize: 11, color: '#777', marginLeft: 6 }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 4 }}>
              <input
                style={{ width: '70%' }}
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
                style={{ marginLeft: 4 }}
                onClick={() => handleAddComment(w.id)}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ))}

      {renderDetailsModal()}
    </div>
  );
}


// ================= CALORIE PAGE (BMR + GOALS) =================

function CaloriePage() {
  const [unitSystem, setUnitSystem] = useState('metric');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [bmr, setBmr] = useState(null);
  const [tdee, setTdee] = useState(null);

  const handleCalculateBmr = (e) => {
    e.preventDefault();
    if (!age) {
      alert('Please enter age');
      return;
    }

    let heightInCm;
    let weightInKg;

    if (unitSystem === 'metric') {
      if (!heightCm || !weightKg) {
        alert('Please fill height and weight');
        return;
      }
      heightInCm = Number(heightCm);
      weightInKg = Number(weightKg);
    } else {
      if (!heightFt || heightIn === '' || !weightLbs) {
        alert('Please fill feet, inches and weight');
        return;
      }
      const totalInches = Number(heightFt) * 12 + Number(heightIn);
      heightInCm = totalInches * 2.54;
      weightInKg = Number(weightLbs) * 0.45359237;
    }

    const ageNum = Number(age);

    let bmrValue;
    if (sex === 'male') {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum + 5;
    } else {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum - 161;
    }

    let multiplier = 1.2;
    if (activity === 'light') multiplier = 1.375;
    if (activity === 'moderate') multiplier = 1.55;
    if (activity === 'active') multiplier = 1.725;
    if (activity === 'very_active') multiplier = 1.9;

    const tdeeValue = bmrValue * multiplier;

    setBmr(Math.round(bmrValue));
    setTdee(Math.round(tdeeValue));
  };

  const goals =
    tdee !== null
      ? [
          {
            group: 'neutral',
            label: 'Maintain weight',
            kcal: tdee,
            percent: 100,
            subtitle: '',
          },
          {
            group: 'loss',
            label: 'Mild weight loss',
            kcal: Math.round(tdee * 0.93),
            percent: 93,
            subtitle: '≈0.25 kg/week',
          },
          {
            group: 'loss',
            label: 'Weight loss',
            kcal: Math.round(tdee * 0.85),
            percent: 85,
            subtitle: '≈0.5 kg/week',
          },
          {
            group: 'loss',
            label: 'Extreme weight loss',
            kcal: Math.round(tdee * 0.7),
            percent: 70,
            subtitle: '≈1 kg/week (short term only)',
          },
          {
            group: 'gain',
            label: 'Mild weight gain',
            kcal: Math.round(tdee * 1.07),
            percent: 107,
            subtitle: '≈0.25 kg/week',
          },
          {
            group: 'gain',
            label: 'Weight gain',
            kcal: Math.round(tdee * 1.15),
            percent: 115,
            subtitle: '≈0.5 kg/week',
          },
          {
            group: 'gain',
            label: 'Fast weight gain',
            kcal: Math.round(tdee * 1.3),
            percent: 130,
            subtitle: 'up to ≈1 kg/week (bulking)',
          },
        ]
      : [];

  return (
    <div>
      <h2>Calorie Calculator</h2>

      <section
        style={{ marginBottom: 30, padding: 10, border: '1px solid #ccc' }}
      >
        <h3>Daily calorie needs (BMR &amp; TDEE)</h3>

        <form onSubmit={handleCalculateBmr}>
          <div style={{ marginBottom: 8 }}>
            <label>Units: </label>
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value)}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lbs)</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Sex: </label>
            <select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Age: </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          {unitSystem === 'metric' ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label>Height (cm): </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Weight (kg): </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <label>Height: </label>
                <input
                  type="number"
                  placeholder="ft"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  style={{ width: 60, marginRight: 4 }}
                />
                <input
                  type="number"
                  placeholder="in"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  style={{ width: 60 }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Weight (lbs): </label>
                <input
                  type="number"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: 8 }}>
            <label>Activity level: </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              <option value="sedentary">
                Sedentary (little or no exercise)
              </option>
              <option value="light">Light (1-3 days/week)</option>
              <option value="moderate">Moderate (3-5 days/week)</option>
              <option value="active">Active (6-7 days/week)</option>
              <option value="very_active">Very active (hard exercise)</option>
            </select>
          </div>

          <button type="submit" style={{ marginTop: 8 }}>
            Calculate daily calories
          </button>
        </form>

        {bmr !== null && tdee !== null && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>BMR:</strong> {bmr} kcal/day (at rest)
            </p>
            <p>
              <strong>Maintenance (TDEE):</strong> {tdee} kcal/day
            </p>

            <div style={{ marginTop: 16 }}>
              {goals.map((g) => (
                <div
                  key={g.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    border: '1px solid #aaa',
                    marginBottom: 6,
                    background:
                      g.group === 'loss'
                        ? '#ffecec'
                        : g.group === 'gain'
                        ? '#ecfff0'
                        : '#f5f5f5',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{g.label}</div>
                    {g.subtitle && (
                      <div style={{ fontSize: 12, color: '#555' }}>
                        {g.subtitle}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                      {g.kcal.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Calories/day &nbsp; {g.percent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ================= FOOD CALORIES PAGE (API NINJAS) =================

function FoodCaloriePage() {
  const [query, setQuery] = useState('');
  const [foodResult, setFoodResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchFood = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setFoodResult(null);

    if (!query.trim()) {
      alert('Enter something like "100g chicken breast" or "1 banana"');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/foodinfo', { params: { query } });
      setFoodResult(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error loading food info');
    }
    setLoading(false);
  };

  const renderFoodCard = () => {
    if (!foodResult || !Array.isArray(foodResult) || foodResult.length === 0) {
      return <p>No results found.</p>;
    }

    const item = foodResult[0];

    const {
      name,
      serving_size_g,
      calories,
      protein_g,
      carbohydrates_total_g,
      fat_total_g,
      sugar_g,
      fiber_g,
    } = item;

    return (
      <div
        style={{
          border: '1px solid #ccc',
          padding: 12,
          marginTop: 10,
          borderRadius: 4,
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: 6 }}>
          {name} ({serving_size_g} g)
        </h4>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div>
            <strong>Calories:</strong> {calories}
          </div>
          <div>
            <strong>Protein:</strong> {protein_g} g
          </div>
          <div>
            <strong>Carbs:</strong> {carbohydrates_total_g} g
          </div>
          <div>
            <strong>Fat:</strong> {fat_total_g} g
          </div>
          <div>
            <strong>Sugar:</strong> {sugar_g} g
          </div>
          <div>
            <strong>Fiber:</strong> {fiber_g} g
          </div>
        </div>

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12 }}>
            Show raw API response
          </summary>
          <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div>
      <h2>Food Calories</h2>

      <section style={{ padding: 10, border: '1px solid #ccc' }}>
        <h3>Food calories lookup (API Ninjas)</h3>
        <form onSubmit={handleSearchFood}>
          <input
            style={{ width: '60%' }}
            placeholder='e.g. "100g rice" or "1 banana"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" style={{ marginLeft: 8 }}>
            Search
          </button>
        </form>

        {loading && <p>Loading...</p>}
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

        {!loading && !errorMsg && foodResult && renderFoodCard()}
      </section>
    </div>
  );
}

export default App;
