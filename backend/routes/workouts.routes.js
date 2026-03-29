const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

async function getAuthUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : null;

  if (!token) {
    const error = new Error("Липсва токен за достъп.");
    error.status = 401;
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    const authError = new Error("Невалиден или изтекъл токен.");
    authError.status = 401;
    throw authError;
  }

  return data.user;
}

async function getAppUserByAuthId(authId) {
  const { data, error } = await supabase
    .from("Users")
    .select("id, auth_id, email, display_name, role")
    .eq("auth_id", authId)
    .single();

  if (error || !data) {
    const appUserError = new Error("Потребителят не е намерен в таблица Users.");
    appUserError.status = 404;
    throw appUserError;
  }

  return data;
}

// Моите тренировки
router.get("/workouts/mine", async (req, res) => {
  try {
    const authUser = await getAuthUserFromRequest(req);
    const appUser = await getAppUserByAuthId(authUser.id);

    const { data, error } = await supabase
      .from("Workouts")
      .select("id, user_id, name, data, is_public, created_at, likes_count")
      .eq("user_id", appUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({
      workouts: data || [],
    });
  } catch (error) {
    console.error("GET /workouts/mine error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Грешка при зареждане на тренировките.",
    });
  }
});

// Публикуване в потока
router.patch("/workouts/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;

    const authUser = await getAuthUserFromRequest(req);
    const appUser = await getAppUserByAuthId(authUser.id);

    const { data: workout, error: workoutError } = await supabase
      .from("Workouts")
      .select("id, user_id, name, data, is_public, created_at, likes_count")
      .eq("id", id)
      .single();

    if (workoutError || !workout) {
      return res.status(404).json({
        message: "Тренировката не е намерена.",
      });
    }

    if (workout.user_id !== appUser.id) {
      return res.status(403).json({
        message: "Нямаш право да публикуваш тази тренировка.",
      });
    }

    if (workout.is_public === true) {
      return res.status(400).json({
        message: "Тренировката вече е публикувана.",
      });
    }

    const { data: updatedWorkout, error: updateError } = await supabase
      .from("Workouts")
      .update({
        is_public: true,
      })
      .eq("id", id)
      .select("id, user_id, name, data, is_public, created_at, likes_count")
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json({
      message: "Тренировката беше публикувана успешно.",
      workout: updatedWorkout,
    });
  } catch (error) {
    console.error("PATCH /workouts/:id/publish error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Грешка при публикуване на тренировката.",
    });
  }
});

module.exports = router;