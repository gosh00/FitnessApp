const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// Create a workout
router.post("/workouts", async (req, res) => {
  try {
    const { user_id, name, exercises, is_public } = req.body;

    if (!user_id || !name || !Array.isArray(exercises) || exercises.length === 0) {
      return res
        .status(400)
        .json({ error: "user_id, name and exercises are required" });
    }

    const data = { exercises };

    const { data: inserted, error } = await supabase
      .from("Workouts")
      .insert([{ user_id, name, data, is_public: !!is_public }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(inserted);
  } catch (err) {
    console.error("Server error (create workout):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get workouts visible for a viewer
router.get("/workouts", async (req, res) => {
  try {
    const { viewer_id } = req.query;

    let query = supabase
      .from("Workouts")
      .select("id, user_id, name, data, is_public, created_at, likes_count")
      .order("created_at", { ascending: false });

    if (viewer_id) query = query.or(`is_public.eq.true,user_id.eq.${viewer_id}`);
    else query = query.eq("is_public", true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error("Server error (list workouts):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Like / Unlike (toggle)
router.post("/workouts/:id/like", async (req, res) => {
  try {
    const workoutId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const { data: workout, error: selError } = await supabase
      .from("Workouts")
      .select("likes_count")
      .eq("id", workoutId)
      .single();

    if (selError) return res.status(500).json({ error: selError.message });

    const currentCount = workout?.likes_count || 0;

    const { data: existingLikes, error: likeSelError } = await supabase
      .from("WorkoutLikes")
      .select("id")
      .eq("workout_id", workoutId)
      .eq("user_id", user_id)
      .limit(1);

    if (likeSelError) return res.status(500).json({ error: likeSelError.message });

    const alreadyLiked = existingLikes && existingLikes.length > 0;

    let newCount = currentCount;
    let likedNow = false;

    if (alreadyLiked) {
      const likeId = existingLikes[0].id;
      const { error: delError } = await supabase
        .from("WorkoutLikes")
        .delete()
        .eq("id", likeId);

      if (delError) return res.status(500).json({ error: delError.message });

      newCount = Math.max(0, currentCount - 1);
      likedNow = false;
    } else {
      const { error: insError } = await supabase
        .from("WorkoutLikes")
        .insert([{ workout_id: workoutId, user_id }]);

      if (insError) return res.status(500).json({ error: insError.message });

      newCount = currentCount + 1;
      likedNow = true;
    }

    const { data: updated, error: updError } = await supabase
      .from("Workouts")
      .update({ likes_count: newCount })
      .eq("id", workoutId)
      .select("id, likes_count")
      .single();

    if (updError) return res.status(500).json({ error: updError.message });

    res.json({ id: updated.id, likes_count: updated.likes_count, liked: likedNow });
  } catch (err) {
    console.error("Server error (like workout):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Comments
router.get("/workouts/:id/comments", async (req, res) => {
  try {
    const workoutId = req.params.id;

    const { data, error } = await supabase
      .from("WorkoutComments")
      .select("*")
      .eq("workout_id", workoutId)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error("Server error (get comments):", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/workouts/:id/comments", async (req, res) => {
  try {
    const workoutId = req.params.id;
    const { user_id, content } = req.body;

    if (!user_id || !content || !content.trim()) {
      return res.status(400).json({ error: "user_id and content are required" });
    }

    const { data, error } = await supabase
      .from("WorkoutComments")
      .insert([{ workout_id: workoutId, user_id, content: content.trim() }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error("Server error (add comment):", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
