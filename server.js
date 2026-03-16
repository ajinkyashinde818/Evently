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

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins
    const allowedOrigins = [
      'http://localhost:4200',
      'https://evently-6416b.web.app',
      'https://evently-6416b.firebaseapp.com',
      'https://precious-macaron-dd9e93.netlify.app'
    ];
    
    if (process.env.CORS_ORIGIN) {
      const additionalOrigins = process.env.CORS_ORIGIN.split(',');
      allowedOrigins.push(...additionalOrigins.map(o => o.trim()));
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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

/* ================= HEALTH CHECK ================= */

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "Railway" : "Local"
  });
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Only check database schema if DATABASE_URL is available (Railway)
    if (process.env.DATABASE_URL) {
      await ensureDatabaseSchema();
      console.log("✅ Railway database schema verified successfully");
    } else {
      console.log("⚠️ No DATABASE_URL found - skipping database schema check");
    }
    
    // Start scheduler only if database is available
    if (process.env.DATABASE_URL) {
      startScheduler();
      console.log("📅 Event scheduler started");
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      if (process.env.DATABASE_URL) {
        console.log(`🔗 Connected to Railway PostgreSQL`);
        console.log(`🌐 Backend URL: https://evently-q95m.onrender.com`);
        console.log(`🔗 Frontend URL: https://evently-6416b.web.app`);
      } else {
        console.log(`🔗 Connected to local PostgreSQL`);
        console.log(`🌐 Backend URL: http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
