const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Ensure upload directories exist
const ensureDirectories = require("./utils/ensureDirectories");
ensureDirectories();

/* ================= IMPORT ROUTES ================= */

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const memoriesRoutes = require("./routes/memoriesRoutes");
const supportRoutes = require("./routes/supportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const { startScheduler } = require("./utils/eventScheduler");
const ensureDatabaseSchema = require("./utils/ensureDatabaseSchema");

/* ================= CREATE APP ================= */

const app = express();

/* ================= MIDDLEWARE ================= */

// Temporary fix: Allow all origins
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES ================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/memories", memoriesRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/feedback", feedbackRoutes);

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await ensureDatabaseSchema();
    console.log("✅ Database schema verified successfully");
    
    // Start scheduler only after schema verification
    startScheduler();
    console.log("📅 Event scheduler started");
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Backend URL: https://evently-backend.onrender.com`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
