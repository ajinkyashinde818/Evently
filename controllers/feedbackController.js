const db = require("../config/db");
const { sendFeedbackRequestEmail } = require("../utils/emailService");

exports.getFeedbackEventInfo = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const result = await db.query(
      `SELECT id, title, status, start_date, end_date
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get feedback event info error:", error);
    res.status(500).json({ error: "Failed to fetch event info" });
  }
};

exports.submitEventFeedback = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const rating = Number(req.body?.rating);
    const feedback = String(req.body?.feedback || "").trim();

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    if (!name || !email || !feedback || !Number.isInteger(rating)) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Name, email, rating, and feedback are required."
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Invalid rating",
        message: "Rating must be between 1 and 5."
      });
    }

    const eventResult = await db.query(
      `SELECT id, title FROM events WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const registrationResult = await db.query(
      `SELECT id, name
       FROM registrations
       WHERE event_id = $1
       AND LOWER(email) = LOWER($2)
       LIMIT 1`,
      [eventId, email]
    );

    if (registrationResult.rows.length === 0) {
      return res.status(403).json({
        error: "Not eligible",
        message: "This email is not registered for the selected event."
      });
    }

    const registrationId = registrationResult.rows[0].id;
    const participantName = name || registrationResult.rows[0].name || "Participant";

    const saveResult = await db.query(
      `INSERT INTO event_feedback (event_id, registration_id, name, email, rating, feedback, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id, email)
       DO UPDATE SET
         registration_id = EXCLUDED.registration_id,
         name = EXCLUDED.name,
         rating = EXCLUDED.rating,
         feedback = EXCLUDED.feedback,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, event_id, name, email, rating, feedback, created_at, updated_at`,
      [eventId, registrationId, participantName, email, rating, feedback]
    );

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: saveResult.rows[0]
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
};

exports.getFeedbackEventsOverview = async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT
         e.id,
         e.title,
         e.status,
         e.start_date,
         e.end_date,
         COUNT(f.id)::int AS feedback_count,
         COALESCE(ROUND(AVG(f.rating)::numeric, 1), 0) AS average_rating
       FROM events e
       LEFT JOIN event_feedback f ON f.event_id = e.id
       GROUP BY e.id, e.title, e.status, e.start_date, e.end_date
       ORDER BY e.start_date DESC NULLS LAST, e.id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get feedback overview error:", error);
    res.status(500).json({ error: "Failed to fetch feedback overview" });
  }
};

exports.getFeedbackByEvent = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const eventResult = await db.query(
      `SELECT id, title, status, start_date, end_date
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const feedbackResult = await db.query(
      `SELECT
         id,
         event_id,
         registration_id,
         name,
         email,
         rating,
         feedback,
         created_at,
         updated_at
       FROM event_feedback
       WHERE event_id = $1
       ORDER BY updated_at DESC, created_at DESC`,
      [eventId]
    );

    const summaryResult = await db.query(
      `SELECT
         COUNT(*)::int AS feedback_count,
         COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating
       FROM event_feedback
       WHERE event_id = $1`,
      [eventId]
    );

    res.json({
      event: eventResult.rows[0],
      summary: summaryResult.rows[0],
      feedback: feedbackResult.rows
    });
  } catch (error) {
    console.error("Get feedback by event error:", error);
    res.status(500).json({ error: "Failed to fetch event feedback" });
  }
};

exports.sendFeedbackInvites = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const eventResult = await db.query(
      `SELECT id, title
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const recipientsResult = await db.query(
      `SELECT DISTINCT
         LOWER(TRIM(email)) AS email,
         COALESCE(NULLIF(TRIM(name), ''), 'Participant') AS name
       FROM registrations
       WHERE event_id = $1
         AND email IS NOT NULL
         AND TRIM(email) <> ''`,
      [eventId]
    );

    const recipients = recipientsResult.rows || [];
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    const eventTitle = eventResult.rows[0].title;

    const sendResults = await Promise.allSettled(
      recipients.map((recipient) => {
        const feedbackLink = `${frontendBaseUrl}/feedback-form/${eventId}?email=${encodeURIComponent(recipient.email)}`;
        return sendFeedbackRequestEmail(
          recipient.email,
          recipient.name,
          eventTitle,
          feedbackLink
        );
      })
    );

    const sent = sendResults.filter(
      (result) => result.status === "fulfilled" && result.value?.success
    ).length;
    const failed = sendResults.length - sent;

    res.json({
      message: "Feedback invites processed",
      totalRecipients: recipients.length,
      sent,
      failed
    });
  } catch (error) {
    console.error("Send feedback invites error:", error);
    res.status(500).json({ error: "Failed to send feedback invites" });
  }
};
