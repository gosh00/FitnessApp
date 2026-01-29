const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/foodinfo", async (req, res) => {
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

module.exports = router;
