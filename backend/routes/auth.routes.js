const express = require("express");
const router = express.Router();

router.post("/auth/sync", async (req, res) => {
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

    res.json({ auth_id, email, display_name: displayName, role });
  } catch (err) {
    console.error("/api/auth/sync error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
