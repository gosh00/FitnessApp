const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

router.get("/exercises", async (req, res) => {
  try {
    const muscle = req.query.muscle;

    let query = supabase.from("Exercises").select("*");
    if (muscle) query = query.eq("muscle_group", muscle);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    console.error("Server error (exercises):", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
