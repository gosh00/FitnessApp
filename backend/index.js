// backend/index.js

// Load .env FIRST
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const supabase = require('./config/supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// ===== TEST ROUTE =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running 🚀' });
});

//
// === Get exercises (from Supabase "Exercises" table) ===
//
app.get('/api/exercises', async (req, res) => {
  try {
    const muscle = req.query.muscle; // optional: ?muscle=chest

    let query = supabase.from('Exercises').select('*');

    if (muscle) {
      query = query.eq('muscle_group', muscle);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error (exercises):', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Server error (exercises):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Log a workout entry (to "ExerciseLog" table) ===
// Expected body: { user_id, exercise_id, sets, reps, weight, date }
//
app.post('/api/logs', async (req, res) => {
  try {
    const { user_id, exercise_id, sets, reps, weight, date } = req.body;

    if (!user_id || !exercise_id || !sets || !reps || !weight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('ExerciseLog')
      .insert([
        {
          user_id,
          exercise_id,
          sets,
          reps,
          weight,
          date: date || new Date().toISOString().split('T')[0],
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error (insert log):', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data[0]);
  } catch (err) {
    console.error('Server error (insert log):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Get last log for an exercise (for "previous set") ===
// GET /api/logs/last?user_id=...&exercise_id=...
//
app.get('/api/logs/last', async (req, res) => {
  try {
    const { user_id, exercise_id } = req.query;

    if (!user_id || !exercise_id) {
      return res
        .status(400)
        .json({ error: 'user_id and exercise_id are required' });
    }

    const { data, error } = await supabase
      .from('ExerciseLog')
      .select('*')
      .eq('user_id', user_id)
      .eq('exercise_id', exercise_id)
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error (last log):', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data[0] || null);
  } catch (err) {
    console.error('Server error (last log):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Food calories lookup using API Ninjas ===
// GET /api/foodinfo?query=100g%20apple
//
//
// === Food calories lookup using API Ninjas ===
// GET /api/foodinfo?query=100g%20apple
//
app.get('/api/foodinfo', async (req, res) => {
  try {
    const query = req.query.query;
    const apiKey = process.env.NINJAS_API_KEY;

    console.log('NINJAS_API_KEY from .env =', apiKey); // debug

    if (!query) {
      return res.status(400).json({ error: 'query is required, e.g. 100g apple' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'NINJAS_API_KEY not set in .env' });
    }

    const url = `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(
      query
    )}`;

    const response = await axios.get(url, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Food API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching food info' });
  }
});

//
// === Sync auth user to Users table (and get role/profile) ===
// POST /api/auth/sync
// Body: { auth_id, email }
//
//
// === Simple auth sync: decide role based on email, no DB table ===
// POST /api/auth/sync
// Body: { auth_id, email }
//
app.post('/api/auth/sync', async (req, res) => {
  try {
    const { auth_id, email } = req.body;

    if (!auth_id || !email) {
      return res.status(400).json({ error: 'auth_id and email are required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    // Decide role: if email matches ADMIN_EMAIL => admin, else user
    const role =
      adminEmail && email.toLowerCase() === adminEmail.toLowerCase()
        ? 'admin'
        : 'user';

    const displayName = email.split('@')[0];

    // We don't use DB here – just send info back
    return res.json({
      auth_id,
      email,
      display_name: displayName,
      role,
    });
  } catch (err) {
    console.error('/api/auth/sync error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Create a workout (private or public) ===
// POST /api/workouts
// Body: { user_id, name, exercises, is_public }
//
// "exercises" is the array you already build in React: 
// [ { exercise_id, sets: [{reps, weight, unit}] }, ... ]
//
app.post('/api/workouts', async (req, res) => {
  try {
    const { user_id, name, exercises, is_public } = req.body;

    if (!user_id || !name || !Array.isArray(exercises) || exercises.length === 0) {
      return res
        .status(400)
        .json({ error: 'user_id, name and exercises are required' });
    }

    const data = { exercises }; // store as JSONB

    const { data: inserted, error } = await supabase
      .from('Workouts')
      .insert([
        {
          user_id,
          name,
          data,
          is_public: !!is_public, // force boolean true/false
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Workouts insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(inserted);
  } catch (err) {
    console.error('Server error (create workout):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Get workouts visible for a viewer ===
// GET /api/workouts?viewer_id=UUID
//
// - If viewer_id is provided: return all PUBLIC workouts + viewer's own
// - If viewer_id is missing: return only PUBLIC workouts
//
app.get('/api/workouts', async (req, res) => {
  try {
    const { viewer_id } = req.query;

    let query = supabase
      .from('Workouts')
      .select('id, user_id, name, data, is_public, created_at')
      .order('created_at', { ascending: false });

    if (viewer_id) {
      // visible = public OR owned by viewer
      query = query.or(`is_public.eq.true,user_id.eq.${viewer_id}`);
    } else {
      // no viewer -> public only
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase Workouts select error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Server error (list workouts):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Like a workout (simple counter) ===
// POST /api/workouts/:id/like
// Body: { user_id }  (we don't enforce unique per user for now)
//
//
// === Like / Unlike a workout (1 like per user, toggle) ===
// POST /api/workouts/:id/like
// Body: { user_id }
//
app.post('/api/workouts/:id/like', async (req, res) => {
  try {
    const workoutId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // 1) Load current likes_count of the workout
    const { data: workout, error: selError } = await supabase
      .from('Workouts')
      .select('likes_count')
      .eq('id', workoutId)
      .single();

    if (selError) {
      console.error('Workouts select (likes) error:', selError);
      return res.status(500).json({ error: selError.message });
    }

    const currentCount = workout?.likes_count || 0;

    // 2) Check if this user already liked the workout
    const { data: existingLikes, error: likeSelError } = await supabase
      .from('WorkoutLikes')
      .select('id')
      .eq('workout_id', workoutId)
      .eq('user_id', user_id)
      .limit(1);

    if (likeSelError) {
      console.error('WorkoutLikes select error:', likeSelError);
      return res.status(500).json({ error: likeSelError.message });
    }

    const alreadyLiked = existingLikes && existingLikes.length > 0;

    let newCount = currentCount;
    let likedNow = false;

    if (alreadyLiked) {
      // 3a) UNLIKE → delete like row and decrement counter
      const likeId = existingLikes[0].id;
      const { error: delError } = await supabase
        .from('WorkoutLikes')
        .delete()
        .eq('id', likeId);

      if (delError) {
        console.error('WorkoutLikes delete error:', delError);
        return res.status(500).json({ error: delError.message });
      }

      newCount = Math.max(0, currentCount - 1);
      likedNow = false;
    } else {
      // 3b) LIKE → insert like row and increment counter
      const { error: insError } = await supabase
        .from('WorkoutLikes')
        .insert([{ workout_id: workoutId, user_id }]);

      if (insError) {
        // unique constraint might be hit in race conditions
        console.error('WorkoutLikes insert error:', insError);
        return res.status(500).json({ error: insError.message });
      }

      newCount = currentCount + 1;
      likedNow = true;
    }

    // 4) Update likes_count on Workouts
    const { data: updated, error: updError } = await supabase
      .from('Workouts')
      .update({ likes_count: newCount })
      .eq('id', workoutId)
      .select('id, likes_count')
      .single();

    if (updError) {
      console.error('Workouts update (likes) error:', updError);
      return res.status(500).json({ error: updError.message });
    }

    // 5) Return new count + flag
    res.json({
      id: updated.id,
      likes_count: updated.likes_count,
      liked: likedNow,
    });
  } catch (err) {
    console.error('Server error (like workout):', err);
    res.status(500).json({ error: 'Server error' });
  }
});


//
// === Get comments for a workout ===
// GET /api/workouts/:id/comments
//
app.get('/api/workouts/:id/comments', async (req, res) => {
  try {
    const workoutId = req.params.id;

    const { data, error } = await supabase
      .from('WorkoutComments')
      .select('*')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('WorkoutComments select error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Server error (get comments):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//
// === Add a comment to a workout ===
// POST /api/workouts/:id/comments
// Body: { user_id, content }
//
app.post('/api/workouts/:id/comments', async (req, res) => {
  try {
    const workoutId = req.params.id;
    const { user_id, content } = req.body;

    if (!user_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'user_id and content are required' });
    }

    const { data, error } = await supabase
      .from('WorkoutComments')
      .insert([
        {
          workout_id: workoutId,
          user_id,
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('WorkoutComments insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Server error (add comment):', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
