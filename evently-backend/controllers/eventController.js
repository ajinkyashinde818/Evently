const pool = require("../config/db");
const PDFDocument = require("pdfkit");
const { sendCertificateEmail } = require("../utils/emailService");

/* ================= CREATE EVENT ================= */

exports.createEvent = async (req, res) => {

  try {

    console.log('Create event request body:', req.body);
    console.log('Create event files:', req.files);

    const {
      title,
      description,
      venue,
      city,
      start_date,
      end_date,
      category,
      type,
      organizer,
      email,
      address,
      maplink,
      registration_limit,
      registration_deadline,
      status = 'published'  // Default to published, but allow upcoming
    } = req.body;

    console.log('Extracted status:', status);

    const banner = req.files && req.files.banner && req.files.banner.length > 0 
      ? req.files.banner[0].filename 
      : null;

    console.log('Banner filename:', banner);

    const result = await pool.query(

      `INSERT INTO events
      (title, description, venue, city, start_date, end_date, category, type, organizer, email, address, maplink, registration_limit, registration_deadline, banner_image, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,

      [
        title,
        description,
        venue,
        city,
        start_date,
        end_date,
        category,
        type,
        organizer,
        email,
        address,
        maplink,
        registration_limit,
        registration_deadline,
        banner,
        status
      ]

    );

    console.log('Event created successfully:', result.rows[0]);

    res.status(201).json({
      message: status === 'upcoming' ? "Event saved as upcoming" : "Event created successfully",
      event: result.rows[0]
    });

  } catch (error) {

    console.error('Create event error:', error);

    res.status(500).json({
      error: "Event creation failed"
    });

  }

};


/* ================= GET ALL EVENTS ================= */

exports.getEvents = async (req, res) => {

  try {

    const result = await pool.query(

      `SELECT 
        events.*,
        COUNT(registrations.id) AS registrations_count
       FROM events
       LEFT JOIN registrations
       ON events.id = registrations.event_id
       GROUP BY events.id
       ORDER BY events.id DESC`

    );

    // Map 'draft' status to 'upcoming' for backward compatibility
    const events = result.rows.map(event => ({
      ...event,
      status: event.status === 'draft' ? 'upcoming' : event.status
    }));

    res.json(events);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch events"
    });

  }

};



/* ================= UPCOMING EVENTS ================= */

exports.getUpcomingEvents = async (req, res) => {

  try {

    const result = await pool.query(

      `SELECT 
        id,
        title,
        venue,
        city,
        start_date,
        status
       FROM events
       WHERE (status='published' OR status='upcoming')
       AND start_date > CURRENT_DATE
       ORDER BY start_date ASC
       LIMIT 5`

    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to fetch upcoming events"
    });

  }

};



/* ================= END EVENT ================= */

exports.endEvent = async (req, res) => {

  const { id } = req.params;

  try {

    // Get event details
    const eventResult = await pool.query(
      `SELECT * FROM events WHERE id=$1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: "Event not found"
      });
    }

    const event = eventResult.rows[0];

    // Get registered users for this event
    const registrationsResult = await pool.query(
      `SELECT * FROM registrations WHERE event_id=$1`,
      [id]
    );

    const registrations = registrationsResult.rows;

    // Generate and send certificates to all registered users (parallel processing)
    const certificatePromises = registrations.map(registration => 
      generateAndSendCertificate(event, registration)
    );
    
    // Send all certificates in parallel
    await Promise.allSettled(certificatePromises);

    // Mark event as completed
    await pool.query(
      `UPDATE events
       SET status='completed'
       WHERE id=$1`,
      [id]
    );

    res.json({
      message: `Event marked as completed and certificates sent to ${registrations.length} registered participants`
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to end event"
    });

  }

};

/* ================= GENERATE AND SEND CERTIFICATE ================= */

async function generateAndSendCertificate(event, registration) {
  
  const PDFDocument = require('pdfkit');
  
  // Create certificate with clear, centered layout
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Set background color (subtle light background to match app)
  doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f7ff');

  // Add decorative border using primary brand color
  doc.strokeColor('#4f6df5').lineWidth(3);
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80).stroke();
  
  // Inner border
  doc.strokeColor('#cbd5f5').lineWidth(1);
  doc.rect(50, 50, pageWidth - 100, pageHeight - 100).stroke();

  // Title section (top centered, two-line)
  doc.fillColor('#111827')
     .fontSize(30)
     .font('Helvetica-Bold')
     .text('CERTIFICATE', 0, 110, { align: 'center' });

  doc.fontSize(16)
     .font('Helvetica')
     .text('OF PARTICIPATION', 0, 150, { align: 'center' });

  // Intro text
  doc.moveDown(2);
  doc.fillColor('#374151')
     .fontSize(16)
     .font('Helvetica')
     .text('This is to certify that', { align: 'center' });
  
  // Participant name (highlighted)
  doc.moveDown(0.8);
  doc.fillColor('#4f6df5')
     .fontSize(26)
     .font('Helvetica-Bold')
     .text(registration.name, { align: 'center' });
  
  // Participation text
  doc.moveDown(0.8);
  doc.fillColor('#374151')
     .fontSize(16)
     .font('Helvetica')
     .text('has successfully participated in', { align: 'center' });
  
  // Event name (decorated)
  doc.moveDown(0.5);
  doc.fillColor('#1f2937')
     .fontSize(22)
     .font('Helvetica-Bold')
     .text(event.title, { align: 'center' });

  // Event details section
  doc.moveDown(2);
  doc.fillColor('#1f2937')
     .fontSize(13)
     .font('Helvetica');

  const eventDate = event.start_date
    ? new Date(event.start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  const venueText = event.venue || event.city || 'Online';

  let detailsY = doc.y;

  if (eventDate) {
    doc.text(`Date: ${eventDate}`, 100, detailsY);
    detailsY = doc.y + 10;
  }

  doc.text(`Venue: ${venueText}`, 100, detailsY);
  detailsY = doc.y + 10;
  
  if (event.start_date && event.end_date) {
    const startDate = new Date(event.start_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endDate = new Date(event.end_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    doc.text(`Duration: ${startDate} - ${endDate}`, 100, detailsY);
  }

  // Decorative separator
  const separatorY = pageHeight - 200;
  doc.strokeColor('#4f6df5').lineWidth(2);
  doc.moveTo(100, separatorY).lineTo(pageWidth - 100, separatorY).stroke();

  // Signature section near bottom
  const signatureY = pageHeight - 150;
  doc.strokeColor('#2c3e50').lineWidth(1);
  
  // Left signature line
  doc.moveTo(100, signatureY).lineTo(260, signatureY).stroke();
  
  // Organizer name from event
  const organizerName = event.organizer || 'Event Organizer';

  doc.fillColor('#111827')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(organizerName, 100, signatureY + 8);

  doc.fillColor('#9ca3af')
     .fontSize(10)
     .font('Helvetica')
     .text('Event Organizer', 100, signatureY + 24);
  
  // Right signature line
  doc.moveTo(pageWidth - 260, signatureY).lineTo(pageWidth - 100, signatureY).stroke();
  
  // Date of issue (today)
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  doc.fillColor('#111827')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('Date of Issue', pageWidth - 260, signatureY + 8);

  doc.fillColor('#9ca3af')
     .fontSize(10)
     .font('Helvetica')
     .text(issueDate, pageWidth - 260, signatureY + 24);

  // Footer + certificate ID
  const certId = `CERT-${event.id}-${registration.id}-${Date.now()}`;
  const footerY = pageHeight - 80;

  doc.fillColor('#95a5a6')
     .fontSize(9)
     .font('Helvetica')
     .text('This certificate is generated automatically by Evently Management System', 0, footerY, { align: 'center' });

  doc.text(`Certificate ID: ${certId}`, 0, footerY + 14, { align: 'center' });

  // Convert PDF to buffer
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  
  return new Promise((resolve, reject) => {
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      
      // Send email with certificate
      try {
        await sendCertificateEmail(registration.email, registration.name, event.title, pdfBuffer);
        resolve();
      } catch (error) {
        console.error('Failed to send certificate email:', error);
        reject(error);
      }
    });
    
    doc.end();
  });
}




/* ================= GET EVENT BY ID ================= */

exports.getEventById = async (req, res) => {

  const { id } = req.params;

  try {

    const result = await pool.query(

      `SELECT *
       FROM events
       WHERE id=$1`,
      [id]

    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        message: "Event not found"
      });

    }

    // Map 'draft' status to 'upcoming' for backward compatibility
    const event = {
      ...result.rows[0],
      status: result.rows[0].status === 'draft' ? 'upcoming' : result.rows[0].status
    };

    res.json(event);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch event"
    });

  }

};



/* ================= UPDATE EVENT ================= */

exports.updateEvent = async (req, res) => {

const { id } = req.params;

const {
  title,
  description,
  venue,
  city,
  start_date,
  end_date,
  category,
  type,
  organizer,
  email,
  address,
  maplink,
  registration_limit,
  registration_deadline,
  status
} = req.body;

try {

let bannerImage = null;
  
// Handle banner upload
if (req.files && req.files.banner && req.files.banner.length > 0) {
  bannerImage = req.files.banner[0].filename;
}

// Build dynamic update query
let updateFields = [];
let updateValues = [];
let paramIndex = 1;

if (title) {
  updateFields.push(`title=$${paramIndex++}`);
  updateValues.push(title);
}
if (description) {
  updateFields.push(`description=$${paramIndex++}`);
  updateValues.push(description);
}
if (venue) {
  updateFields.push(`venue=$${paramIndex++}`);
  updateValues.push(venue);
}
if (city) {
  updateFields.push(`city=$${paramIndex++}`);
  updateValues.push(city);
}
if (start_date) {
  updateFields.push(`start_date=$${paramIndex++}`);
  updateValues.push(start_date);
}
if (end_date) {
  updateFields.push(`end_date=$${paramIndex++}`);
  updateValues.push(end_date);
}
if (category) {
  updateFields.push(`category=$${paramIndex++}`);
  updateValues.push(category);
}
if (type) {
  updateFields.push(`type=$${paramIndex++}`);
  updateValues.push(type);
}
if (organizer) {
  updateFields.push(`organizer=$${paramIndex++}`);
  updateValues.push(organizer);
}
if (email) {
  updateFields.push(`email=$${paramIndex++}`);
  updateValues.push(email);
}
if (address) {
  updateFields.push(`address=$${paramIndex++}`);
  updateValues.push(address);
}
if (maplink) {
  updateFields.push(`maplink=$${paramIndex++}`);
  updateValues.push(maplink);
}
if (registration_limit) {
  updateFields.push(`registration_limit=$${paramIndex++}`);
  updateValues.push(registration_limit);
}
if (registration_deadline) {
  updateFields.push(`registration_deadline=$${paramIndex++}`);
  updateValues.push(registration_deadline);
}
if (status) {
  updateFields.push(`status=$${paramIndex++}`);
  updateValues.push(status);
}
if (bannerImage) {
  updateFields.push(`banner_image=$${paramIndex++}`);
  updateValues.push(bannerImage);
}

// Add ID as last parameter
updateValues.push(id);

const result = await pool.query(
  `UPDATE events
   SET ${updateFields.join(', ')}
   WHERE id=$${paramIndex}
   RETURNING *`,
  updateValues
);

res.json(result.rows[0]);

} catch (error) {

console.error(error);

res.status(500).json({
  error: "Update failed"
});

}

};



/* ================= DELETE EVENT ================= */

exports.deleteEvent = async (req, res) => {

  const { id } = req.params;

  try {

    /* GET EVENT */

    const eventResult = await pool.query(
      `SELECT * FROM events WHERE id=$1`,
      [id]
    );

    if(eventResult.rows.length === 0){
      return res.status(404).json({
        error:"Event not found"
      });
    }

    const event = eventResult.rows[0];
    
    /* ALLOW DELETE ONLY IF COMPLETED */
    
    if (event.status !== "completed") {
      return res.status(400).json({
        error: "Only completed events can be deleted"
      });
    }

    /* COLLECT REGISTRATION STATS BEFORE DELETE */

    const statsResult = await pool.query(
      `SELECT 
         COUNT(*)::int AS total_registrations,
         COALESCE(SUM(CASE WHEN checked_in = true THEN 1 ELSE 0 END), 0)::int AS checked_in_count
       FROM registrations
       WHERE event_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0] || { total_registrations: 0, checked_in_count: 0 };
    const notCheckedIn = stats.total_registrations - stats.checked_in_count;

    const participantsResult = await pool.query(
      `SELECT name, email, phone, checked_in, created_at
       FROM registrations
       WHERE event_id = $1
       ORDER BY created_at ASC
       LIMIT 40`,
      [id]
    );

    const participants = participantsResult.rows || [];
    
    /* DELETE REGISTRATIONS */
    
    await pool.query(
      `DELETE FROM registrations WHERE event_id=$1`,
      [id]
    );
    
    /* DELETE EVENT */
    
    await pool.query(
      `DELETE FROM events WHERE id=$1`,
      [id]
    );
    
    /* GENERATE PDF REPORT */
    
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });
    
    res.setHeader("Content-Type", "application/pdf");
    
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=event-report-${id}.pdf`
    );
    
    doc.pipe(res);
    
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    /* HEADER */
    
    doc.rect(0, 0, pageWidth, 120).fill("#4f6df5");
    
    doc
      .fillColor("white")
      .fontSize(32)
      .font("Helvetica-Bold")
      .text("EVENT REPORT", 0, 40, { align: "center" });
    
    doc
      .fontSize(16)
      .font("Helvetica")
      .text("Summary of completed event", 0, 80, { align: "center" });
    
    /* EVENT TITLE */

    doc.moveDown(2);
    doc
      .fillColor("#111827")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(event.title, { align: "center" });

    /* EVENT OVERVIEW SECTION */

    doc.moveDown(1.5);
    doc
      .fillColor("#4b5563")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Event Overview", 50, 160);

    doc.moveTo(50, 180).lineTo(pageWidth - 50, 180).strokeColor("#e5e7eb").lineWidth(1).stroke();

    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica").fillColor("#111827");

    const formatDate = (value) => {
      if (!value) return "N/A";
      try {
        return new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch {
        return String(value);
      }
    };

    const leftX = 50;
    const rightX = pageWidth / 2 + 10;
    let currentY = 190;

    // Left column
    doc.text(`Event ID: ${event.id}`, leftX, currentY);
    doc.text(`Venue: ${event.venue || "N/A"}`, leftX, currentY + 18);
    doc.text(`City: ${event.city || "N/A"}`, leftX, currentY + 36);
    doc.text(`Address: ${event.address || "N/A"}`, leftX, currentY + 54, {
      width: rightX - leftX - 10
    });
    doc.text(`Category: ${event.category || "N/A"}`, leftX, currentY + 88);
    doc.text(`Type: ${event.type || "N/A"}`, leftX, currentY + 106);

    // Right column
    doc.text(`Status: ${event.status || "N/A"}`, rightX, currentY);
    doc.text(`Start Date: ${formatDate(event.start_date)}`, rightX, currentY + 18);
    doc.text(`End Date: ${formatDate(event.end_date)}`, rightX, currentY + 36);
    doc.text(`Organizer: ${event.organizer || "N/A"}`, rightX, currentY + 54);
    doc.text(`Contact Email: ${event.email || "N/A"}`, rightX, currentY + 72);
    doc.text(`Map Link: ${event.maplink || "N/A"}`, rightX, currentY + 90, {
      width: pageWidth - rightX - 40
    });

    currentY += 120;

    const regLimit = event.registration_limit || 0;
    const totalRegs = stats.total_registrations || 0;
    const occupancy =
      regLimit > 0 ? `${Math.round((totalRegs / regLimit) * 100)}%` : "N/A";

    doc.text(`Registration Limit: ${regLimit || "N/A"}`, leftX, currentY);
    doc.text(
      `Registration Deadline: ${formatDate(event.registration_deadline)}`,
      rightX,
      currentY
    );

    currentY += 30;

    /* REGISTRATION SUMMARY SECTION */

    doc.moveDown(2);
    doc
      .fillColor("#4b5563")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Registration Summary", 50, currentY);

    const summaryTop = currentY + 20;

    doc.moveTo(50, summaryTop).lineTo(pageWidth - 50, summaryTop).strokeColor("#e5e7eb").lineWidth(1).stroke();

    doc.fontSize(11).font("Helvetica").fillColor("#111827");

    const boxWidth = (pageWidth - 100 - 40) / 3; // three boxes with gaps
    const boxY = summaryTop + 15;

    // Total registrations
    doc
      .roundedRect(50, boxY, boxWidth, 60, 6)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Total Registrations", 60, boxY + 10);
    doc
      .fontSize(16)
      .fillColor("#4f6df5")
      .text(String(totalRegs), 60, boxY + 30);

    // Checked-in
    const box2X = 50 + boxWidth + 20;
    doc
      .roundedRect(box2X, boxY, boxWidth, 60, 6)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#111827")
      .text("Checked-in", box2X + 10, boxY + 10);
    doc
      .fontSize(16)
      .fillColor("#10b981")
      .text(String(stats.checked_in_count || 0), box2X + 10, boxY + 30);

    // Not checked-in
    const box3X = box2X + boxWidth + 20;
    doc
      .roundedRect(box3X, boxY, boxWidth, 60, 6)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#111827")
      .text("Not Checked-in", box3X + 10, boxY + 10);
    doc
      .fontSize(16)
      .fillColor("#ef4444")
      .text(String(notCheckedIn < 0 ? 0 : notCheckedIn), box3X + 10, boxY + 30);

    const summaryBottomY = boxY + 80;

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text(`Occupancy: ${occupancy}`, 50, summaryBottomY);

    /* PARTICIPANT SNAPSHOT (FIRST 40) */

    let tableY = summaryBottomY + 30;

    if (participants.length > 0) {
      doc
        .fillColor("#4b5563")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Participant Snapshot (first 40 records)", 50, tableY);

      tableY += 18;

      const colNameX = 50;
      const colEmailX = colNameX + 150;
      const colStatusX = pageWidth - 130;

      // Header row
      doc
        .moveTo(50, tableY)
        .lineTo(pageWidth - 50, tableY)
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .stroke();

      tableY += 6;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Name", colNameX, tableY);
      doc.text("Email", colEmailX, tableY);
      doc.text("Status", colStatusX, tableY);

      tableY += 16;

      doc
        .moveTo(50, tableY)
        .lineTo(pageWidth - 50, tableY)
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .stroke();

      tableY += 6;

      doc.fontSize(10).font("Helvetica").fillColor("#111827");

      for (const p of participants) {
        if (tableY > pageHeight - 80) {
          // Stop if we reach bottom margin
          break;
        }

        const statusLabel = p.checked_in ? "Checked-in" : "Not checked-in";

        doc.text(p.name || "N/A", colNameX, tableY, { width: 130, ellipsis: true });
        doc.text(p.email || "N/A", colEmailX, tableY, { width: 220, ellipsis: true });
        doc.text(statusLabel, colStatusX, tableY);

        tableY += 16;
      }
    }

    /* FOOTER */

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(
        "Generated automatically by Evently Management System after event completion and deletion.",
        50,
        pageHeight - 60,
        { align: "center" }
      );
    
    doc.end();

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:"Delete failed"
    });

  }

};
