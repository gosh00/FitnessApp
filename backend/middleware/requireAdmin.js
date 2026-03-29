const supabase = require("../config/supabaseClient");

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: "Липсва токен за достъп." });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ message: "Невалиден или изтекъл токен." });
    }

    const authUser = authData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("Users")
      .select("id, auth_id, email, display_name, role")
      .eq("auth_id", authUser.id)
      .single();

    if (appUserError || !appUser) {
      return res
        .status(403)
        .json({ message: "Потребителят не е намерен в системата." });
    }

    if (appUser.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Нямаш права за достъп до администраторския панел." });
    }

    req.authUser = authUser;
    req.adminUser = appUser;

    next();
  } catch (error) {
    console.error("requireAdmin error:", error);
    return res.status(500).json({ message: "Грешка при проверка на администраторски достъп." });
  }
}

module.exports = requireAdmin;