const express = require("express");
const router = express.Router();

const supabase = require("../config/supabaseClient");
const requireAdmin = require("../middleware/requireAdmin");

router.use(requireAdmin);

async function getExactCount(tableName, filterCallback = null) {
  let query = supabase.from(tableName).select("*", { head: true, count: "exact" });

  if (typeof filterCallback === "function") {
    query = filterCallback(query);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

// OVERVIEW
router.get("/admin/overview", async (req, res) => {
  try {
    const totalUsers = await getExactCount("Users");
    const totalAdmins = await getExactCount("Users", (q) => q.eq("role", "admin"));
    const totalExercises = await getExactCount("Exercises");
    const totalLogs = await getExactCount("ExerciseLog");

    return res.json({
      totalUsers,
      totalAdmins,
      totalExercises,
      totalLogs,
    });
  } catch (error) {
    console.error("GET /admin/overview error:", error);
    return res.status(500).json({ message: "Грешка при зареждане на административното табло." });
  }
});

// USERS
router.get("/admin/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Users")
      .select(`
        id,
        email,
        display_name,
        role,
        created_at,
        updated_at,
        auth_id,
        first_name,
        last_name,
        gender,
        age,
        weight,
        height,
        goal,
        bio,
        avatar_url
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ users: data || [] });
  } catch (error) {
    console.error("GET /admin/users error:", error);
    return res.status(500).json({ message: "Грешка при зареждане на потребителите." });
  }
});

// UPDATE USER ROLE
router.patch("/admin/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Невалидна роля. Позволени стойности: user, admin." });
    }

    const { data: targetUser, error: targetUserError } = await supabase
      .from("Users")
      .select("id, auth_id, role, email, display_name")
      .eq("id", id)
      .single();

    if (targetUserError || !targetUser) {
      return res.status(404).json({ message: "Потребителят не е намерен." });
    }

    // Забрана админът да свали собствената си роля оттук
    if (req.adminUser.id === targetUser.id && role !== "admin") {
      return res.status(400).json({
        message: "Не можеш да премахнеш собствените си администраторски права от този панел.",
      });
    }

    // Да не остане системата без нито един admin
    if (targetUser.role === "admin" && role !== "admin") {
      const adminCount = await getExactCount("Users", (q) => q.eq("role", "admin"));

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Системата трябва да има поне един администратор.",
        });
      }
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("Users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        email,
        display_name,
        role,
        created_at,
        updated_at,
        auth_id,
        first_name,
        last_name,
        gender,
        age,
        weight,
        height,
        goal,
        bio,
        avatar_url
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json({
      message: "Ролята е обновена успешно.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /admin/users/:id/role error:", error);
    return res.status(500).json({ message: "Грешка при обновяване на ролята." });
  }
});

// EXERCISES LIST
router.get("/admin/exercises", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Exercises")
      .select("id, name, muscle_group, description, image_url")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({ exercises: data || [] });
  } catch (error) {
    console.error("GET /admin/exercises error:", error);
    return res.status(500).json({ message: "Грешка при зареждане на упражненията." });
  }
});

// CREATE EXERCISE
router.post("/admin/exercises", async (req, res) => {
  try {
    const { name, muscle_group, description, image_url } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Името на упражнението е задължително." });
    }

    const payload = {
      name: String(name).trim(),
      muscle_group: muscle_group ? String(muscle_group).trim() : null,
      description: description ? String(description).trim() : null,
      image_url: image_url ? String(image_url).trim() : null,
    };

    const { data, error } = await supabase
      .from("Exercises")
      .insert(payload)
      .select("id, name, muscle_group, description, image_url")
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      message: "Упражнението е добавено успешно.",
      exercise: data,
    });
  } catch (error) {
    console.error("POST /admin/exercises error:", error);
    return res.status(500).json({ message: "Грешка при добавяне на упражнение." });
  }
});

// UPDATE EXERCISE
router.put("/admin/exercises/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, muscle_group, description, image_url } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Името на упражнението е задължително." });
    }

    const payload = {
      name: String(name).trim(),
      muscle_group: muscle_group ? String(muscle_group).trim() : null,
      description: description ? String(description).trim() : null,
      image_url: image_url ? String(image_url).trim() : null,
    };

    const { data, error } = await supabase
      .from("Exercises")
      .update(payload)
      .eq("id", id)
      .select("id, name, muscle_group, description, image_url")
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      message: "Упражнението е редактирано успешно.",
      exercise: data,
    });
  } catch (error) {
    console.error("PUT /admin/exercises/:id error:", error);
    return res.status(500).json({ message: "Грешка при редакция на упражнение." });
  }
});

// DELETE EXERCISE
router.delete("/admin/exercises/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("Exercises")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.json({ message: "Упражнението е изтрито успешно." });
  } catch (error) {
    console.error("DELETE /admin/exercises/:id error:", error);
    return res.status(500).json({ message: "Грешка при изтриване на упражнение." });
  }
});

module.exports = router;