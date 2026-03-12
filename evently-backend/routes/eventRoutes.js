const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const upload = require("../config/uploadMedia");


/* ================= CREATE EVENT ================= */

router.post(
  "/create",
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 }   // optional gallery images
  ]),
  eventController.createEvent
);


/* ================= GET ALL EVENTS ================= */

router.get(
  "/",
  eventController.getEvents
);

router.get(
  "/all",
  eventController.getEvents
);


/* ================= GET UPCOMING EVENTS ================= */

router.get(
  "/upcoming",
  eventController.getUpcomingEvents
);


/* ================= GET EVENT BY ID ================= */

router.get(
  "/:id",
  eventController.getEventById
);


/* ================= UPDATE EVENT ================= */

router.put(
  "/update/:id",
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "gallery", maxCount: 10 }
  ]),
  eventController.updateEvent
);


/* ================= END EVENT ================= */

router.put(
  "/end/:id",
  eventController.endEvent
);


/* ================= DELETE EVENT ================= */

router.delete(
  "/delete/:id",
  eventController.deleteEvent
);


module.exports = router;