const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const upload = require("../middleware/upload");

// POST /api/profile/ensure
router.post("/profile/ensure", async (req, res) => {
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

// POST /api/profile/update
router.post("/profile/update", async (req, res) => {
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

// POST /api/profile/avatar
router.post("/profile/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const { auth_id, user_id } = req.body;

    if (!auth_id || !user_id) {
      return res.status(400).json({ error: "auth_id and user_id are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "avatar file is required" });
    }

    // ownership check
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
    const filePath = `${auth_id}/avatar.png`;

    // Try replace first
    let { error: upErr } = await supabase.storage
      .from(bucket)
      .update(filePath, file.buffer, {
        contentType: mime,
        cacheControl: "0",
      });

    if (upErr) {
      const msg = String(upErr.message || "").toLowerCase();
      const code = String(upErr.statusCode || upErr.status || "");
      const notFound =
        msg.includes("not found") || msg.includes("does not exist") || code === "404";

      if (notFound) {
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, file.buffer, {
            contentType: mime,
            cacheControl: "0",
            upsert: true,
          });
        if (uploadErr) return res.status(500).json({ error: uploadErr.message });
      } else {
        return res.status(500).json({ error: upErr.message });
      }
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) return res.status(500).json({ error: "Failed to get public URL" });

    const { data: updated, error: updErr } = await supabase
      .from("Users")
      .update({ avatar_url: publicUrl })
      .eq("id", user_id)
      .select("avatar_url")
      .single();

    if (updErr) return res.status(500).json({ error: updErr.message });

    res.json({ avatar_url: updated.avatar_url });
  } catch (err) {
    console.error("Avatar upload route error:", err);
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

module.exports = router;
