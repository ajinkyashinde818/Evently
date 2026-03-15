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

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES ================= */

/* allows images to be accessed from browser */
app.use(
"/uploads",
express.static(path.join(__dirname, "uploads"))
);

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);

app.use("/api/events", eventRoutes);

app.use("/api/registrations", registrationRoutes);

app.use("/api/memories", memoriesRoutes);

app.use("/uploads", express.static("uploads"));

app.use("/api/support", supportRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/feedback", feedbackRoutes);
/* ================= TEST ROUTE ================= */

app.get("/", (req, res) => {

res.send("🚀 Evently Backend Running Successfully");

});

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {

console.error(err.stack);

res.status(500).json({
error: "Server Error"
});

});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

// Start event scheduler
// const { startScheduler } = require("./utils/eventScheduler");

app.listen(PORT, () => {

console.log(`🚀 Server running on port ${PORT}`);

ensureDatabaseSchema()
  .then(() => {
    startScheduler();
  })
  .catch((error) => {
    console.error("Skipping scheduler startup because schema verification failed:", error.message);
  });

});
