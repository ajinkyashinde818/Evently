const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");

router.get("/events", feedbackController.getFeedbackEventsOverview);
router.get("/event/:eventId/info", feedbackController.getFeedbackEventInfo);
router.get("/event/:eventId", feedbackController.getFeedbackByEvent);
router.post("/event/:eventId", feedbackController.submitEventFeedback);
router.post("/event/:eventId/send-invites", feedbackController.sendFeedbackInvites);

module.exports = router;
