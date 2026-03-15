const express = require("express");
const router = express.Router();

const registrationController = require("../controllers/registrationController");

/* REGISTER USER */
router.post("/:eventId", registrationController.registerUser);

/* GET EVENT REGISTRATIONS (for admin) */
router.get("/event/:eventId", registrationController.getEventRegistrations);

/* GET ALL REGISTRATIONS (for admin) */
router.get("/", registrationController.getAllRegistrations);

/* DELETE REGISTRATION */
router.delete("/:registrationId", registrationController.deleteRegistration);

/* CHECK-IN USER */
router.put("/checkin/:ticketId", registrationController.checkInUser);

/* Reject direct browser opens of the registration API */
router.all("/:eventId", (req, res) => {
  res.status(405).json({
    error: "Method not allowed",
    message: "Registration requires POST method",
    correctUsage: "POST /api/registrations/:eventId",
    eventId: req.params.eventId
  });
});

console.log("Registration Routes Loaded");

module.exports = router;
