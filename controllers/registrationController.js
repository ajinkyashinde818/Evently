console.log("Registration Controller Loaded");
const db = require("../config/db");
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

// Helper function to generate unique parking slot number
async function generateParkingSlotNumber(eventId, parkingType) {
  try {
    let prefix;
    switch (parkingType) {
      case 'standard':
        prefix = 'STD';
        break;
      case 'premium':
        prefix = 'PRM';
        break;
      case 'valet':
        prefix = 'VLT';
        break;
      default:
        prefix = 'PARK';
    }

    // Generate an event-specific slot number so existing bookings from
    // other events cannot trap the request in a recursive loop.
    const numericEventId = Number(eventId);
    const slotPrefix = `${prefix}-${numericEventId}-`;
    const result = await db.query(
      `SELECT COALESCE(
          MAX(CAST(split_part(slot_number, '-', 3) AS INTEGER)),
          0
        ) AS max_slot
       FROM parking_bookings
       WHERE event_id = $1
         AND parking_type = $2
         AND slot_number LIKE $3`,
      [numericEventId, parkingType, `${slotPrefix}%`]
    );

    const nextSlotNumber = Number(result.rows[0]?.max_slot || 0) + 1;
    return `${slotPrefix}${String(nextSlotNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating parking slot number:', error);
    throw error;
  }
}

const { v4: uuidv4 } = require("uuid");
const { sendEmail, getEmailDeliveryState } = require("../utils/emailService");

let registrationColumnMapPromise = null;

async function getRegistrationColumnMap() {
  if (!registrationColumnMapPromise) {
    registrationColumnMapPromise = db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'registrations'`
    ).then((result) => {
      const columns = new Set(result.rows.map((row) => row.column_name));

      return {
        parkingColumn: columns.has("parking_type") ? "parking_type" : (columns.has("parking_option") ? "parking_option" : null),
        hasParkingPrice: columns.has("parking_price"),
        hasTimeSlot: columns.has("time_slot"),
        hasCheckedIn: columns.has("checked_in"),
        hasCreatedAt: columns.has("created_at")
      };
    }).catch((error) => {
      registrationColumnMapPromise = null;
      throw error;
    });
  }

  return registrationColumnMapPromise;
}

function toDateOnlyValue(dateInput) {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDeadlineCloseTime(dateInput) {
  const deadline = new Date(dateInput);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

/* ================= REGISTER USER ================= */

const registerUser = async (req,res)=>{
  const client = await db.connect();
  try{
    const { name, email, phone, parkingOption, timeSlot } = req.body;
    const normalizedName = (name || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPhone = (phone || "").trim();
    const normalizedParkingOption = parkingOption || "none";
    const eventId = req.params.eventId;
    const registrationColumns = await getRegistrationColumnMap();
    const parkingColumn = registrationColumns.parkingColumn;

    /* GENERATE TICKET ID */

    const ticketId = `EVT-${uuidv4().split("-")[0].toUpperCase()}`;

    /* GET EVENT WITH PARKING CONFIGURATION AND REGISTRATION LIMIT */

    const event = await client.query(
      `SELECT title, parking_enabled, standard_slots, premium_slots, valet_slots, standard_price, premium_price, valet_price, registration_limit, registration_deadline, status, start_date, end_date FROM events WHERE id=$1`,
      [eventId]
    );

    if(event.rows.length === 0){
      return res.status(404).json({error:"Event not found"});
    }

    const eventData = event.rows[0];

    // Check if event is completed
    if (eventData.status === 'completed') {
      return res.status(400).json({
        error: "Event completed",
        message: "This event has already ended and is no longer accepting registrations or check-ins",
        eventStatus: eventData.status,
        endDate: eventData.end_date
      });
    }

    // Check if event end date has passed (additional safety check)
    if (eventData.end_date) {
      const endDate = new Date(eventData.end_date);
      const now = new Date();
      if (endDate < now) {
        return res.status(400).json({
          error: "Event ended",
          message: "This event's end date has passed and it is no longer accepting registrations or check-ins",
          endDate: eventData.end_date
        });
      }
    }

    /* CHECK REGISTRATION LIMIT AND DEADLINE */
    
    // Check if registration deadline has passed
    if (eventData.registration_deadline) {
      const deadline = getDeadlineCloseTime(eventData.registration_deadline);
      const now = new Date();
      if (now > deadline) {
        return res.status(400).json({
          error: "Registration deadline has passed",
          message: "Registration for this event has closed",
          deadline: eventData.registration_deadline
        });
      }
    }

    // Check if registration limit has been reached
    if (eventData.registration_limit) {
      const currentRegistrations = await client.query(
        `SELECT COUNT(*) as count FROM registrations WHERE event_id=$1`,
        [eventId]
      );
      
      const registeredCount = parseInt(currentRegistrations.rows[0].count);
      
      if (registeredCount >= eventData.registration_limit) {
        return res.status(400).json({
          error: "Registration limit reached",
          message: `This event has reached its maximum registration limit of ${eventData.registration_limit} people`,
          currentRegistrations: registeredCount,
          maxRegistrations: eventData.registration_limit,
          isFull: true
        });
      }
    }

    const existingRegistration = await client.query(
      `SELECT id FROM registrations WHERE event_id=$1 AND LOWER(email)=LOWER($2) LIMIT 1`,
      [eventId, normalizedEmail]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(409).json({
        error: "Already registered",
        message: "This email is already registered for the event"
      });
    }

    /* PARKING SLOT VALIDATION */
    let parkingPrice = 0;

    if (normalizedParkingOption !== 'none') {
      // Check if parking is enabled for this event
      if (!eventData.parking_enabled) {
        return res.status(400).json({error: "Parking is not available for this event"});
      }

      // Check parking slot availability
      const parkingTypeField = `${normalizedParkingOption}_slots`;
      const availableSlots = eventData[parkingTypeField] || 0;
      
      const currentBookingsQuery = parkingColumn
        ? {
            text: `SELECT COUNT(*) as count FROM registrations WHERE event_id=$1 AND ${parkingColumn}=$2`,
            values: [eventId, normalizedParkingOption]
          }
        : {
            text: `SELECT COUNT(*) as count FROM parking_bookings WHERE event_id=$1 AND parking_type=$2`,
            values: [eventId, normalizedParkingOption]
          };

      const currentBookings = await client.query(
        currentBookingsQuery.text,
        currentBookingsQuery.values
      );
      
      const bookedSlots = parseInt(currentBookings.rows[0].count);
      
      if (bookedSlots >= availableSlots) {
        return res.status(400).json({
          error: `Selected parking type (${parkingOption}) is full. Please choose another option.`
        });
      }

      // Calculate parking price
      const priceField = `${normalizedParkingOption}_price`;
      parkingPrice = eventData[priceField] || 0;
    }

    await client.query("BEGIN");

    /* SAVE REGISTRATION WITH PARKING INFO */
    const registrationInsertColumns = [
      "event_id",
      "name",
      "email",
      "phone",
      "ticket_id"
    ];
    const registrationInsertValues = [
      eventId,
      normalizedName,
      normalizedEmail,
      normalizedPhone,
      ticketId
    ];

    if (registrationColumns.hasCheckedIn) {
      registrationInsertColumns.push("checked_in");
      registrationInsertValues.push(false);
    }

    if (parkingColumn) {
      registrationInsertColumns.push(parkingColumn);
      registrationInsertValues.push(normalizedParkingOption);
    }

    if (registrationColumns.hasParkingPrice) {
      registrationInsertColumns.push("parking_price");
      registrationInsertValues.push(parkingPrice);
    }

    if (registrationColumns.hasTimeSlot) {
      registrationInsertColumns.push("time_slot");
      registrationInsertValues.push(timeSlot || null);
    }

    const registrationPlaceholders = registrationInsertColumns.map((_, index) => `$${index + 1}`);

    const registrationInsertResult = await client.query(
      `INSERT INTO registrations (${registrationInsertColumns.join(",")})
       VALUES(${registrationPlaceholders.join(",")})
       RETURNING id`,
      registrationInsertValues
    );

    /* SAVE PARKING BOOKING IF NEEDED */
    let assignedSlotNumber = null;
    const registrationId = registrationInsertResult.rows[0]?.id;
    if (normalizedParkingOption !== 'none' && registrationId) {
      // Generate unique parking slot number
      assignedSlotNumber = await generateParkingSlotNumber(eventId, normalizedParkingOption);
      await client.query(
        `INSERT INTO parking_bookings (registration_id, event_id, parking_type, price, slot_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [registrationId, eventId, normalizedParkingOption, parkingPrice, assignedSlotNumber]
      );
    }

    await client.query("COMMIT");

    const emailDeliveryState = getEmailDeliveryState();

    if (!res.headersSent) {
      res.json({
        message: "Registration successful",
        ticketId,
        parkingType: normalizedParkingOption,
        parkingPrice: parkingPrice,
        parkingSlotNumber: assignedSlotNumber,
        emailDeliveryAvailable: emailDeliveryState.available,
        emailPausedUntil: emailDeliveryState.pausedUntil
      });
    }

    /* GENERATE QR */

    const qrData = JSON.stringify({
      ticketId: ticketId
    });

    const qrImage = await QRCode.toBuffer(qrData);

    /* CREATE PDF */

    const doc = new PDFDocument({
      size:"A4",
      margin:50
    });

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));

    // Create a promise to wait for PDF generation
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on("error", (err) => reject(err));
    });

    // Response has already been sent after commit.

    // Continue with PDF generation and email in background
    (async () => {
      try {
        // Wait for PDF to be generated
        const pdfData = await pdfPromise;
        console.log('📄 PDF generated, size:', pdfData.length, 'bytes');

        // Send email with ticket
        console.log('📧 Starting email send process...');
        
        const mailOptions = {
          from: `Evently <${process.env.EMAIL_USER}>`,
          to: normalizedEmail,
          subject: "Your Event Ticket",
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #4f6df5; margin: 0;">🎫 Your Event Ticket</h2>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2c3e50; margin-top: 0;">Registration Confirmed!</h3>
    <p><strong>Event:</strong> ${eventData.title}</p>
    <p><strong>Name:</strong> ${normalizedName}</p>
    <p><strong>Email:</strong> ${normalizedEmail}</p>
    <p><strong>Phone:</strong> ${normalizedPhone}</p>
    <p><strong>Ticket ID:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${ticketId}</code></p>
  </div>
  
  ${normalizedParkingOption !== 'none' ? `
  <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #155724; margin-top: 0;">🚗 Parking Information</h3>
    <p><strong>Parking Type:</strong> ${normalizedParkingOption.charAt(0).toUpperCase() + normalizedParkingOption.slice(1)}</p>
    ${assignedSlotNumber ? `<p><strong>Your Parking Slot:</strong> <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${assignedSlotNumber}</span></p>` : ''}
    ${timeSlot ? `<p><strong>Arrival Time:</strong> ${timeSlot}</p>` : ''}
    <p style="font-size: 14px; color: #666; margin-top: 15px;">Please display your parking slot number at the parking entrance for quick access.</p>
  </div>
  ` : ''}
  
  <div style="text-align: center; margin: 30px 0;">
    <p style="color: #666; font-size: 14px;">Your ticket is attached as a PDF. Please bring it to the event.</p>
    <p style="color: #666; font-size: 14px;">Scan the QR code at the event check-in desk for quick entry.</p>
  </div>
  
  <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
    <p style="color: #666; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
    <p style="color: #666; font-size: 12px; margin: 0;">© 2026 Evently. All rights reserved.</p>
  </div>
</div>
`,
          attachments: [{
            filename: "ticket.pdf",
            content: pdfData
          }]
        };

        console.log('📨 Sending email to:', normalizedEmail);
        const emailResult = await sendEmail(mailOptions, 1);
        if (!emailResult.success) {
          console.error('Ticket email could not be delivered:', emailResult.error);
          return;
        }
        const info = { messageId: emailResult.messageId, accepted: [normalizedEmail] };
        console.log('✅ Email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Accepted recipients:', info.accepted);
        
      } catch (error) {
        console.error('❌ PDF generation or email sending failed:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
      }
    })();

    /* ================= PDF DESIGN ================= */
    const pageWidth = doc.page.width;

    /* ================= TITLE ================= */

    doc
      .font("Times-Bold")
      .fontSize(42)
      .fillColor("#4f6df5")
      .text("EVENTLY PASS", 0, 80, { align: "center" });

    doc.moveDown(0.5);

    /* ================= EVENT INFO ================= */

    doc
      .font("Times-Roman")
      .fillColor("black")
      .fontSize(18)
      .text(`Event: ${eventData.title}`, { align: "center" });

    doc.moveDown(0.5);

    doc.text(`Name: ${normalizedName}`, { align: "center" });

    doc.moveDown(0.5);

    doc.text(`Email: ${normalizedEmail}`, { align: "center" });

    doc.moveDown(0.5);

    doc.text(`Phone: ${normalizedPhone}`, { align: "center" });

    doc.moveDown(0.5);

    // Add parking information if selected
    if (normalizedParkingOption !== 'none') {
      doc.text(`Parking: ${normalizedParkingOption.charAt(0).toUpperCase() + normalizedParkingOption.slice(1)}`, { align: "center" });
      doc.moveDown(0.5);
      
      if (assignedSlotNumber) {
        doc.text(`Parking Slot: ${assignedSlotNumber}`, { align: "center" });
        doc.moveDown(0.5);
      }
      
      if (timeSlot) {
        doc.text(`Arrival Time: ${timeSlot}`, { align: "center" });
        doc.moveDown(0.5);
      }
    }

    doc.text(`Ticket ID: ${ticketId}`, { align: "center" });

    doc.moveDown(0.5);

    /* ================= QR CODE ================= */

    const qrSize = 300;   // exact QR size

    const qrX = (pageWidth - qrSize) / 2;  // center horizontally

    const qrY = doc.y + 10;  // small space from text

    doc.image(qrImage, qrX, qrY, {
      width: qrSize,
      height: qrSize
    });

    /* move cursor below QR */
    doc.y = qrY + qrSize + 40;

    /* ================= FOOTER ================= */

    doc
      .font("Times-Roman")
      .fontSize(16)
      .fillColor("blue")
      
      .text(
        "Scan this QR code at the event check-in desk",
        { align: "center" }
      );

    doc.end();

  } catch(err){
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }
    console.log(err);
    if (!res.headersSent) {
      res.status(500).json({
        error:"Registration failed"
      });
    }
  } finally {
    client.release();
  }
};


/* ================= GET ALL REGISTRATIONS ================= */

const getAllRegistrations = async (req,res)=>{

try{

const registrationColumns = await getRegistrationColumnMap();

const result = await db.query(

`SELECT
registrations.id,
registrations.name,
registrations.email,
registrations.phone,
registrations.ticket_id,
${registrationColumns.hasCheckedIn ? "registrations.checked_in" : "false AS checked_in"},
events.title
FROM registrations
JOIN events
ON registrations.event_id = events.id
ORDER BY registrations.id DESC`

);

res.json(result.rows);

}catch(err){

console.log(err);
res.status(500).json({error:"Failed to fetch registrations"});

}

};


/* ================= GET EVENT REGISTRATIONS ================= */

const getEventRegistrations = async (req,res)=>{

try{

const eventId = req.params.eventId;

const registrationColumns = await getRegistrationColumnMap();
const parkingSelect = registrationColumns.parkingColumn
  ? `COALESCE(r.${registrationColumns.parkingColumn}, 'none') AS parking_type,`
  : `'none' AS parking_type,`;
const parkingPriceSelect = registrationColumns.hasParkingPrice
  ? `COALESCE(r.parking_price, 0) AS parking_price,`
  : `0 AS parking_price,`;
const timeSlotSelect = registrationColumns.hasTimeSlot
  ? `COALESCE(r.time_slot, '') AS time_slot,`
  : `'' AS time_slot,`;

const result = await db.query(

`SELECT
 r.id,
 r.event_id,
 r.name,
 r.email,
 r.phone,
 r.ticket_id,
 ${registrationColumns.hasCheckedIn ? "r.checked_in" : "false AS checked_in"},
 ${parkingSelect}
 ${parkingPriceSelect}
 ${timeSlotSelect}
 pb.slot_number
FROM registrations r
LEFT JOIN parking_bookings pb ON r.id = pb.registration_id
WHERE r.event_id=$1
ORDER BY r.id DESC`,

[eventId]

);

res.json(result.rows);

}catch(err){

console.log(err);
res.status(500).json({error:"Failed to fetch event registrations"});

}

};


/* ================= CHECK-IN USER ================= */

const checkInUser = async (req,res)=>{

try{

const ticketId = req.params.ticketId.trim();

const registrationColumns = await getRegistrationColumnMap();
const parkingSelect = registrationColumns.parkingColumn
  ? `COALESCE(r.${registrationColumns.parkingColumn}, 'none') AS parking_type,`
  : `'none' AS parking_type,`;
const parkingPriceSelect = registrationColumns.hasParkingPrice
  ? `COALESCE(r.parking_price, 0) AS parking_price,`
  : `0 AS parking_price,`;
const timeSlotSelect = registrationColumns.hasTimeSlot
  ? `COALESCE(r.time_slot, '') AS time_slot,`
  : `'' AS time_slot,`;

const result = await db.query(

`SELECT r.name, ${registrationColumns.hasCheckedIn ? "r.checked_in" : "false AS checked_in"}, ${parkingSelect} ${parkingPriceSelect} ${timeSlotSelect} pb.slot_number, e.status as event_status, e.start_date, e.end_date
FROM registrations r
LEFT JOIN parking_bookings pb ON r.id = pb.registration_id
LEFT JOIN events e ON r.event_id = e.id
WHERE r.ticket_id=$1`,

[ticketId]

);

if(result.rows.length === 0){
return res.status(404).json({error:"Invalid ticket"});
}

const registration = result.rows[0];
const normalizedEventStatus = String(registration.event_status || '').toLowerCase();

// Check if event is completed
if (normalizedEventStatus === 'completed') {
  return res.status(400).json({
    error: "Event completed",
    message: "This event has already ended and is no longer accepting check-ins",
    eventStatus: registration.event_status,
    endDate: registration.end_date
  });
}

// Check if event end date has passed (additional safety check)
if (registration.end_date) {
  const endDate = new Date(registration.end_date);
  const now = new Date();
  if (endDate < now) {
    return res.status(400).json({
      error: "Event ended",
      message: "This event's end date has passed and it is no longer accepting check-ins",
      endDate: registration.end_date
    });
  }
}

if (normalizedEventStatus !== 'published' && normalizedEventStatus !== 'live') {
  const isUpcoming = normalizedEventStatus === 'upcoming' || normalizedEventStatus === 'draft';
  return res.status(400).json({
    error: "Check-in not available",
    message: isUpcoming
      ? "Check-in is locked for upcoming events"
      : "Check-in is available only for published or live events",
    eventStatus: registration.event_status,
    startDate: registration.start_date
  });
}

if(result.rows[0].checked_in){
return res.status(400).json({error:"Ticket already checked-in"});
}

if (registrationColumns.hasCheckedIn) {
await db.query(

`UPDATE registrations
SET checked_in=true
WHERE ticket_id=$1`,

[ticketId]

);
}

res.json({
message:"Check-in successful",
user:{ 
  name:result.rows[0].name,
  parkingType: result.rows[0].parking_type,
  parkingPrice: result.rows[0].parking_price,
  timeSlot: result.rows[0].time_slot,
  parkingSlotNumber: result.rows[0].slot_number
}
});

}catch(err){

console.log(err);
res.status(500).json({error:"Check-in failed"});

}

};

/* DELETE REGISTRATION */
const deleteRegistration = async (req, res) => {
  try {
    const registrationId = req.params.registrationId;
    
    console.log('🗑️ Deleting registration:', registrationId);
    
    // First, get registration details for logging
    const registrationDetails = await db.query(
      `SELECT r.id, r.name, r.email, r.ticket_id, e.title as event_title
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [registrationId]
    );
    
    if (registrationDetails.rows.length === 0) {
      return res.status(404).json({ 
        error: "Registration not found",
        message: "The specified registration does not exist"
      });
    }
    
    const registration = registrationDetails.rows[0];
    
    // Delete parking booking if exists
    await db.query(
      `DELETE FROM parking_bookings WHERE registration_id = $1`,
      [registrationId]
    );
    
    // Delete the registration
    await db.query(
      `DELETE FROM registrations WHERE id = $1`,
      [registrationId]
    );
    
    console.log('✅ Registration deleted successfully:', {
      id: registrationId,
      name: registration.name,
      email: registration.email,
      event: registration.event_title,
      ticketId: registration.ticket_id
    });
    
    res.json({
      success: true,
      message: "Registration deleted successfully",
      deletedRegistration: {
        id: registrationId,
        name: registration.name,
        email: registration.email,
        event: registration.event_title,
        ticketId: registration.ticket_id
      }
    });
    
  } catch (err) {
    console.error('❌ Delete registration error:', err);
    res.status(500).json({ 
      error: "Failed to delete registration",
      message: "An error occurred while deleting the registration"
    });
  }
};

/* EXPORT CONTROLLERS */

module.exports = { 
  registerUser, 
  getEventRegistrations, 
  getAllRegistrations, 
  checkInUser,
  deleteRegistration 
};
