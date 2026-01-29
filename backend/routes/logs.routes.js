const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// Log a workout entry
router.post("/logs", async (req, res) => {
  try {
    const { user_id, exercise_id, sets, reps, weight, date } = req.body;

    if (!user_id || !exercise_id || !sets || !reps || !weight) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("ExerciseLog")
      .insert([
        {
          user_id,
          exercise_id,
          sets,
          reps,
          weight,
          date: date || new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data[0]);
  } catch (err) {
    console.error("Server error (insert log):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get last log for an exercise
router.get("/logs/last", async (req, res) => {
  try {
    const { user_id, exercise_id } = req.query;

    if (!user_id || !exercise_id) {
      return res
        .status(400)
        .json({ error: "user_id and exercise_id are required" });
    }

    const { data, error } = await supabase
      .from("ExerciseLog")
      .select("*")
      .eq("user_id", user_id)
      .eq("exercise_id", exercise_id)
      .order("date", { ascending: false })
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data[0] || null);
  } catch (err) {
    console.error("Server error (last log):", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
