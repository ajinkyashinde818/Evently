const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Signup route
router.post("/signup", authController.signup);

// Login route
router.post("/login", authController.login);

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

module.exports = router;