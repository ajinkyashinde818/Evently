const express = require("express");
const router = express.Router();

const registrationController = require("../controllers/registrationController");

/* REGISTER USER */
router.post("/:eventId", registrationController.registerUser);

/* GET ALL REGISTRATIONS */
router.get("/", registrationController.getAllRegistrations);

/* GET EVENT REGISTRATIONS */
router.get("/event/:eventId", registrationController.getEventRegistrations);

/* CHECK-IN USER */
router.put("/checkin/:ticketId", registrationController.checkInUser);

console.log("Registration Routes Loaded");

module.exports = router;