const pool = require("../config/db");
const { generateEventReport } = require("./reportGenerator");
const { sendEmail } = require("./emailService");

// Keep event lifecycle in sync with the configured start/end timestamps.
async function syncEventLifecycle() {
  try {
    console.log("Checking event lifecycle updates...");

    const publishedEventsResult = await pool.query(`
      UPDATE events
      SET status = 'published'
      WHERE status = 'upcoming'
        AND start_date IS NOT NULL
        AND NOW() >= (start_date - INTERVAL '3 days')
        AND NOW() < start_date
      RETURNING id, title
    `);

    const liveEventsResult = await pool.query(`
      UPDATE events
      SET status = 'live'
      WHERE status IN ('published', 'upcoming', 'draft')
        AND start_date IS NOT NULL
        AND start_date <= NOW()
        AND (end_date IS NULL OR end_date > NOW())
      RETURNING id, title
    `);

    const deletedEventsResult = await pool.query(`
      UPDATE events
      SET status = 'deleted'
      WHERE status NOT IN ('deleted', 'completed')
        AND end_date IS NOT NULL
        AND end_date <= NOW()
      RETURNING id, title
    `);

    if (publishedEventsResult.rows.length > 0) {
      console.log(
        `Opened registration for ${publishedEventsResult.rows.length} upcoming event(s):`,
        publishedEventsResult.rows.map((event) => `${event.id}:${event.title}`).join(", ")
      );
    }

    if (liveEventsResult.rows.length > 0) {
      console.log(
        `Marked ${liveEventsResult.rows.length} event(s) as live:`,
        liveEventsResult.rows.map((event) => `${event.id}:${event.title}`).join(", ")
      );
    }

    if (deletedEventsResult.rows.length > 0) {
      console.log(
        `Marked ${deletedEventsResult.rows.length} event(s) as deleted:`,
        deletedEventsResult.rows.map((event) => `${event.id}:${event.title}`).join(", ")
      );
    }

  } catch (error) {
    console.error("Error syncing event lifecycle:", error);
  }
}

// Backward-compatible wrapper for older imports/usages.
async function checkExpiredEvents() {
  await syncEventLifecycle();
}

// Handle individual expired event
async function handleExpiredEvent(event) {
  try {
    console.log(`Processing expired event: ${event.title} (ID: ${event.id})`);

    // 1. Generate final report before deletion
    await generateFinalReport(event);

    // 2. Get all registered participants
    const registrationsResult = await pool.query(
      `SELECT * FROM registrations WHERE event_id = $1`,
      [event.id]
    );

    // 3. Send notification emails to participants
    await sendExpirationNotifications(event, registrationsResult.rows);

    // 4. Mark event as deleted (soft delete)
    await pool.query(
      `UPDATE events SET status = 'deleted' WHERE id = $1`,
      [event.id]
    );

    console.log(`Event "${event.title}" has been automatically deleted and processed`);

  } catch (error) {
    console.error(`Error handling expired event ${event.id}:`, error);
  }
}

// Generate final comprehensive report
async function generateFinalReport(event) {
  try {
    console.log(`Generating final report for event: ${event.title}`);
    
    // Get complete event data
    const registrationsResult = await pool.query(
      `SELECT * FROM registrations WHERE event_id = $1`,
      [event.id]
    );

    const reportData = {
      event: event,
      registrations: registrationsResult.rows,
      totalParticipants: registrationsResult.rows.length,
      generatedAt: new Date().toISOString(),
      reportType: 'Final Event Report'
    };

    // Generate PDF report
    const pdfBuffer = await generateEventReport(reportData);
    
    // Save report to file system
    const fs = require('fs');
    const path = require('path');
    const reportFileName = `final-report-${event.id}-${Date.now()}.pdf`;
    const reportPath = path.join(__dirname, '../uploads/reports', reportFileName);

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, pdfBuffer);
    console.log(`Final report generated: ${reportPath}`);

    return reportPath;

  } catch (error) {
    console.error(`Error generating final report for event ${event.id}:`, error);
  }
}

// Send expiration notifications to participants
async function sendExpirationNotifications(event, registrations) {
  try {
    // Generate final report for attachment
    const reportData = {
      event: event,
      registrations: registrations,
      totalParticipants: registrations.length,
      generatedAt: new Date().toISOString(),
      reportType: 'Final Event Report'
    };

    const pdfBuffer = await generateEventReport(reportData);

    for (const registration of registrations) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: registration.email,
        subject: `Event Completed - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h2 style="color: #e74c3c; margin: 10px 0;">Event Completed</h2>
            </div>
            
            <p>Dear <strong>${registration.name}</strong>,</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Event Details:</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString()}</p>
              <p><strong>Location:</strong> ${event.venue || event.city || 'Online'}</p>
              <p><strong>Total Participants:</strong> ${registrations.length}</p>
            </div>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">Important Notice:</h3>
              <p>This event has automatically concluded as the registration deadline has passed.</p>
              <p>A comprehensive final report has been generated and is attached to this email.</p>
              <p>The event data will be automatically deleted from our system.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; font-size: 14px;">
                Thank you for participating in <strong>${event.title}</strong>!
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `final-report-${event.title.replace(/\s+/g, '-')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const emailResult = await sendEmail(mailOptions, 0);
      if (emailResult.success) {
        console.log(`Expiration notification sent to: ${registration.email}`);
      } else {
        console.error(`Expiration notification failed for ${registration.email}:`, emailResult.error);
      }
    }

  } catch (error) {
    console.error('Error sending expiration notifications:', error);
  }
}

// Start the scheduler
function startScheduler() {
  // Check frequently so event status flips close to the configured time.
  setInterval(syncEventLifecycle, 60 * 1000);

  // Also check immediately on startup.
  syncEventLifecycle();
}

module.exports = {
  syncEventLifecycle,
  checkExpiredEvents,
  handleExpiredEvent,
  generateFinalReport,
  sendExpirationNotifications,
  startScheduler
};
