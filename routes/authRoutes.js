const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Protected routes (require authentication)
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);
router.put("/change-password", authMiddleware, authController.changePassword);

// Profile picture routes
router.post("/upload-avatar", authMiddleware, authController.upload.single('avatar'), authController.uploadAvatar);
router.delete("/remove-avatar", authMiddleware, authController.removeAvatar);

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working " });
});

module.exports = router;