// backend/index.js
// Load .env FIRST
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");

const supabase = require("./config/supabaseClient");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ===== TEST ROUTE =====
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

//
// === Get exercises (from Supabase "Exercises" table) ===
//
app.get("/api/exercises", async (req, res) => {
  try {
    const muscle = req.query.muscle; // optional: ?muscle=chest

    let query = supabase.from("Exercises").select("*");
    if (muscle) query = query.eq("muscle_group", muscle);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error (exercises):", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error (exercises):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Log a workout entry (to "ExerciseLog" table) ===
//
app.post("/api/logs", async (req, res) => {
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

    if (error) {
      console.error("Supabase error (insert log):", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data[0]);
  } catch (err) {
    console.error("Server error (insert log):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Get last log for an exercise ===
//
app.get("/api/logs/last", async (req, res) => {
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

    if (error) {
      console.error("Supabase error (last log):", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data[0] || null);
  } catch (err) {
    console.error("Server error (last log):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Food calories lookup using API Ninjas ===
//
app.get("/api/foodinfo", async (req, res) => {
  try {
    const query = req.query.query;
    const apiKey = process.env.NINJAS_API_KEY;

    if (!query) {
      return res
        .status(400)
        .json({ error: "query is required, e.g. 100g apple" });
    }
    if (!apiKey) {
      return res.status(500).json({ error: "NINJAS_API_KEY not set in .env" });
    }

    const url = `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(
      query
    )}`;

    const response = await axios.get(url, {
      headers: { "X-Api-Key": apiKey },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Food API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error fetching food info" });
  }
});

//
// === Simple auth sync ===
//
app.post("/api/auth/sync", async (req, res) => {
  try {
    const { auth_id, email } = req.body;

    if (!auth_id || !email) {
      return res.status(400).json({ error: "auth_id and email are required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const role =
      adminEmail && email.toLowerCase() === adminEmail.toLowerCase()
        ? "admin"
        : "user";

    const displayName = email.split("@")[0];

    return res.json({ auth_id, email, display_name: displayName, role });
  } catch (err) {
    console.error("/api/auth/sync error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Create a workout ===
//
app.post("/api/workouts", async (req, res) => {
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

    if (error) {
      console.error("Supabase Workouts insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(inserted);
  } catch (err) {
    console.error("Server error (create workout):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Get workouts visible for a viewer ===
//
app.get("/api/workouts", async (req, res) => {
  try {
    const { viewer_id } = req.query;

    let query = supabase
      .from("Workouts")
      .select("id, user_id, name, data, is_public, created_at")
      .order("created_at", { ascending: false });

    if (viewer_id) query = query.or(`is_public.eq.true,user_id.eq.${viewer_id}`);
    else query = query.eq("is_public", true);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase Workouts select error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error (list workouts):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Like / Unlike a workout (toggle) ===
//
app.post("/api/workouts/:id/like", async (req, res) => {
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

//
// =======================
// PROFILE ROUTES
// =======================
//

/**
 * POST /api/profile/ensure
 * Body: { auth_id, email }
 */
app.post("/api/profile/ensure", async (req, res) => {
  try {
    const { auth_id, email } = req.body;

    if (!auth_id || !email) {
      return res.status(400).json({ error: "auth_id and email are required" });
    }

    // 1) by auth_id
    let { data: row, error: err1 } = await supabase
      .from("Users")
      .select(
        "id, email, display_name, bio, age, weight, height, goal, auth_id, avatar_url"
      )
      .eq("auth_id", auth_id)
      .maybeSingle();

    if (err1) return res.status(500).json({ error: err1.message });
    if (row) return res.json(row);

    // 2) by email -> attach auth_id
    const { data: byEmail, error: err2 } = await supabase
      .from("Users")
      .select(
        "id, email, display_name, bio, age, weight, height, goal, auth_id, avatar_url"
      )
      .eq("email", email)
      .maybeSingle();

    if (err2) return res.status(500).json({ error: err2.message });

    if (byEmail) {
      const { data: attached, error: err3 } = await supabase
        .from("Users")
        .update({ auth_id })
        .eq("id", byEmail.id)
        .select(
          "id, email, display_name, bio, age, weight, height, goal, auth_id, avatar_url"
        )
        .single();

      if (err3) return res.status(500).json({ error: err3.message });
      return res.json(attached);
    }

    // 3) create
    const defaultName = email.split("@")[0] || "User";
    const avatar_url = `https://api.dicebear.com/9.x/identicon/svg?seed=${auth_id}`;

    const { data: inserted, error: err4 } = await supabase
      .from("Users")
      .insert({
        auth_id,
        email,
        display_name: defaultName,
        goal: "Maintain Weight",
        avatar_url,
      })
      .select(
        "id, email, display_name, bio, age, weight, height, goal, auth_id, avatar_url"
      )
      .single();

    if (err4) return res.status(500).json({ error: err4.message });
    return res.json(inserted);
  } catch (e) {
    console.error("/api/profile/ensure error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/profile/update
 * Body: { user_id, display_name, bio, age, weight, height, goal }
 */
app.post("/api/profile/update", async (req, res) => {
  try {
    const { user_id, display_name, bio, age, weight, height, goal } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const payload = { display_name, bio, age, weight, height, goal };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { data, error } = await supabase
      .from("Users")
      .update(payload)
      .eq("id", user_id)
      .select(
        "id, email, display_name, bio, age, weight, height, goal, auth_id, avatar_url"
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (e) {
    console.error("/api/profile/update error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

/**
 * POST /api/profile/avatar
 * multipart/form-data: { avatar(file), auth_id, user_id }
 *
 * ✅ supports multiple updates:
 * - always writes to <auth_id>/avatar.png
 * - uses update() to replace, falls back to upload() if not found
 * - cacheControl: "0" to reduce caching
 */
app.post("/api/profile/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const { auth_id, user_id } = req.body;

    if (!auth_id || !user_id) {
      return res.status(400).json({ error: "auth_id and user_id are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "avatar file is required" });
    }

    // ownership check (prevents changing someone else's avatar)
    const { data: existing, error: selErr } = await supabase
      .from("Users")
      .select("id, auth_id")
      .eq("id", user_id)
      .single();

    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing.auth_id !== auth_id) {
      return res.status(403).json({ error: "Forbidden (not your profile)" });
    }

    const file = req.file;
    const mime = file.mimetype || "";
    if (!mime.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    const bucket = "avatars";
    const filePath = `${auth_id}/avatar.png`; // ✅ fixed path for all uploads

    // Try replace first
    let { error: upErr } = await supabase.storage.from(bucket).update(filePath, file.buffer, {
      contentType: mime,
      cacheControl: "0",
    });

    // If it doesn't exist yet, upload it once
    if (upErr) {
      const msg = String(upErr.message || "").toLowerCase();
      const code = String(upErr.statusCode || upErr.status || "");
      const notFound =
        msg.includes("not found") || msg.includes("does not exist") || code === "404";

      if (notFound) {
        const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, file.buffer, {
          contentType: mime,
          cacheControl: "0",
          upsert: true,
        });
        if (uploadErr) {
          console.error("Storage upload error:", uploadErr);
          return res.status(500).json({ error: uploadErr.message });
        }
      } else {
        console.error("Storage update error:", upErr);
        return res.status(500).json({ error: upErr.message });
      }
    }

    // Public URL
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) return res.status(500).json({ error: "Failed to get public URL" });

    // Update Users.avatar_url
    const { data: updated, error: updErr } = await supabase
      .from("Users")
      .update({ avatar_url: publicUrl })
      .eq("id", user_id)
      .select("avatar_url")
      .single();

    if (updErr) {
      console.error("Users update avatar_url error:", updErr);
      return res.status(500).json({ error: updErr.message });
    }

    res.json({ avatar_url: updated.avatar_url });
  } catch (err) {
    console.error("Avatar upload route error:", err);
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

//
// === Get comments for a workout ===
//
app.get("/api/workouts/:id/comments", async (req, res) => {
  try {
    const workoutId = req.params.id;

    const { data, error } = await supabase
      .from("WorkoutComments")
      .select("*")
      .eq("workout_id", workoutId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("WorkoutComments select error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error (get comments):", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// === Add a comment to a workout ===
//
app.post("/api/workouts/:id/comments", async (req, res) => {
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

    if (error) {
      console.error("WorkoutComments insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error (add comment):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
