// backend/app.js
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const exercisesRoutes = require("./routes/exercises.routes");
const logsRoutes = require("./routes/logs.routes");
const foodRoutes = require("./routes/food.routes");
const authRoutes = require("./routes/auth.routes");
const workoutsRoutes = require("./routes/workouts.routes");
const profileRoutes = require("./routes/profile.routes");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use("/api", healthRoutes);
app.use("/api", exercisesRoutes);
app.use("/api", logsRoutes);
app.use("/api", foodRoutes);
app.use("/api", authRoutes);
app.use("/api", workoutsRoutes);
app.use("/api", profileRoutes);

module.exports = app;
