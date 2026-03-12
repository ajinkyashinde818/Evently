const pool = require("../config/db");
const { sendEventImagesEmail } = require("../utils/emailService");

/* ================= UPLOAD EVENT IMAGES ================= */

exports.uploadImages = async (req, res) => {

  try {

    const eventId = req.params.eventId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    // Store images in database
    for (const file of req.files) {

      await pool.query(
        `INSERT INTO event_images (event_id, file_name)
         VALUES ($1, $2)`,
        [eventId, file.filename]
      );

    }

    // Get event details and registered users
    const eventResult = await pool.query(
      `SELECT * FROM events WHERE id=$1`,
      [eventId]
    );

    const registrationsResult = await pool.query(
      `SELECT * FROM registrations WHERE event_id=$1`,
      [eventId]
    );

    const event = eventResult.rows[0];
    const registrations = registrationsResult.rows;

    // Respond immediately to user
    res.json({
      message: `Images uploaded successfully! Sending to ${registrations.length} registered participants...`,
      successCount: registrations.length,
      totalCount: registrations.length
    });

    // Send emails in background with parallel processing
    setImmediate(async () => {
      console.log(`Starting parallel email sending to ${registrations.length} users...`);
      
      // Create parallel email sending promises
      const emailPromises = registrations.map(registration => 
        sendEventImagesEmail(event, registration, req.files)
      );
      
      // Send all emails in parallel
      const results = await Promise.allSettled(emailPromises);
      
      // Count successful sends
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      console.log(`Email sending completed: ${successCount}/${registrations.length} successful`);
    });

  } catch (error) {
    console.error("Upload images error:", error);
    res.status(500).json({
      error: "Image upload failed"
    });
  }
}


/* ================= GET EVENT IMAGES ================= */

exports.getEventImages = async (req, res) => {

  try {

    const eventId = req.params.eventId;

    const result = await pool.query(
      `SELECT * FROM event_images
       WHERE event_id=$1
       ORDER BY id DESC`,
      [eventId]
    );

    res.json(result.rows);

  } catch (error) {

    console.error("Fetch images error:", error);

    res.status(500).json({
      error: "Failed to fetch images"
    });

  }

};

/* ================= UPLOAD CERTIFICATES ================= */

exports.uploadCertificates = async (req, res) => {

  try {

    const eventId = req.params.eventId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No certificates uploaded" });
    }

    for (const file of req.files) {

      await pool.query(
        `INSERT INTO event_certificates (event_id, file_name)
         VALUES ($1, $2)`,
        [eventId, file.filename]
      );

    }

    res.json({
      message: "Certificates uploaded successfully"
    });

  } catch (error) {

    console.error("Upload certificate error:", error);

    res.status(500).json({
      error: "Certificate upload failed"
    });

  }

};

/* ================= GET EVENT CERTIFICATES ================= */

exports.getCertificates = async (req, res) => {

  try {

    const eventId = req.params.eventId;

    const result = await pool.query(
      `SELECT * FROM event_certificates
       WHERE event_id=$1
       ORDER BY id DESC`,
      [eventId]
    );

    res.json(result.rows);

  } catch (error) {

    console.error("Fetch certificates error:", error);

    res.status(500).json({
      error: "Failed to fetch certificates"
    });

  }

};
