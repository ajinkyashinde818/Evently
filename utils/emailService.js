const transporter = require('../config/mail');
const path = require('path');
const fs = require('fs');
const MAIL_LIMIT_COOLDOWN_MS = Number(process.env.MAIL_LIMIT_COOLDOWN_MS || 60 * 60 * 1000);
const MAIL_SEND_CONCURRENCY = Number(process.env.MAIL_SEND_CONCURRENCY || 3);
let mailPausedUntil = 0;
const emailQueue = [];
let activeEmailJobs = 0;

function isDailyLimitError(error) {
  const text = `${error?.message || ''}\n${error?.response || ''}`.toLowerCase();
  return text.includes('daily user sending limit exceeded');
}

function processEmailQueue() {
  while (activeEmailJobs < MAIL_SEND_CONCURRENCY && emailQueue.length > 0) {
    const queuedJob = emailQueue.shift();
    activeEmailJobs += 1;

    queuedJob.run()
      .then(queuedJob.resolve)
      .catch(queuedJob.reject)
      .finally(() => {
        activeEmailJobs -= 1;
        processEmailQueue();
      });
  }
}

function enqueueEmailJob(run) {
  return new Promise((resolve, reject) => {
    emailQueue.push({ run, resolve, reject });
    processEmailQueue();
  });
}

async function deliverEmail(mailOptions, retries = 1) {
  if (Date.now() < mailPausedUntil) {
    return {
      success: false,
      code: 'MAIL_PAUSED',
      error: `Email sending is temporarily paused until ${new Date(mailPausedUntil).toLocaleString()}`
    };
  }

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    if (isDailyLimitError(error)) {
      mailPausedUntil = Date.now() + MAIL_LIMIT_COOLDOWN_MS;
      console.error(
        `Email sending paused: Gmail daily sending limit exceeded until ${new Date(mailPausedUntil).toLocaleString()}`
      );
      return {
        success: false,
        code: 'MAIL_LIMIT_EXCEEDED',
        error: `Gmail daily sending limit exceeded. Email sending paused until ${new Date(mailPausedUntil).toLocaleString()}`
      };
    }

    console.error('Email sending failed:', error.message || error);

    if (retries > 0) {
      console.log(`Retrying email send, attempts remaining: ${retries}`);
      return deliverEmail(mailOptions, retries - 1);
    }

    return { success: false, code: error.code || 'EMAIL_SEND_FAILED', error: error.message };
  }
}

// Optimized email sending function
async function sendEmail(mailOptions, retries = 1) {
  return enqueueEmailJob(() => deliverEmail(mailOptions, retries));
}

function getEmailDeliveryState() {
  return {
    available: Date.now() >= mailPausedUntil,
    pausedUntil: mailPausedUntil || null
  };
}

function cloneAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    ...attachment,
    content: attachment.content
  }));
}

function buildImageAttachments(uploadedFiles = []) {
  const attachments = [];

  for (const file of uploadedFiles) {
    const filePath = path.join(__dirname, '../uploads', file.filename);

    if (fs.existsSync(filePath)) {
      attachments.push({
        filename: file.originalname || file.filename,
        content: fs.readFileSync(filePath),
        contentType: file.mimetype || 'image/jpeg'
      });
    }
  }

  return attachments;
}

// Certificate email function
async function sendCertificateEmail(email, userName, eventName, pdfBuffer) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Certificate of Participation - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#4f6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="#4f6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 style="color: #4f6df5; margin: 10px 0;">Certificate of Participation</h2>
        </div>
        <p>Dear ${userName},</p>
        <p>Congratulations! You have successfully participated in <strong>${eventName}</strong>.</p>
        <p>Your certificate of participation is attached to this email.</p>
        <p>Thank you for being part of this amazing event!</p>
        <br>
        <p>Best regards,<br>Evently Team</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `,
    attachments: [
      {
        filename: `certificate-${eventName.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return await sendEmail(mailOptions);
}

// Event images email function
async function sendEventImagesEmail(event, registration, uploadedFilesOrAttachments) {
  const attachments = Array.isArray(uploadedFilesOrAttachments) && uploadedFilesOrAttachments.length > 0 &&
    uploadedFilesOrAttachments[0]?.content
    ? cloneAttachments(uploadedFilesOrAttachments)
    : buildImageAttachments(uploadedFilesOrAttachments);

  // If no valid attachments, skip email
  if (attachments.length === 0) {
    return { success: false, error: 'No valid image files found' };
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: registration.email,
    subject: `Event Photos - ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#4f6df5" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="#4f6df5"/>
            <polyline points="21 15 16 10 5 21" stroke="#4f6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 style="color: #4f6df5; margin: 10px 0;">Event Photos Available</h2>
        </div>
        <p>Dear ${registration.name},</p>
        <p>Great news! Photos from <strong>${event.title}</strong> are now available.</p>
        <p>We've attached all the event photos to this email for you to download and share.</p>
        <p>Thank you for participating in this amazing event!</p>
        <br>
        <p>Best regards,<br>Evently Team</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `,
    attachments: attachments
  };

  return await sendEmail(mailOptions);
}

// Registration confirmation email function
async function sendRegistrationEmail(email, userName, eventName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Registration Confirmed - ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5v14a3 3 0 003 3h6a3 3 0 003-3V5a3 3 0 00-3-3h-6a3 3 0 00-3 3z" stroke="#4f6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 20l6-6m0 0l-6 6" stroke="#4f6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 style="color: #4f6df5; margin: 10px 0;">Registration Confirmed</h2>
        </div>
        <p>Dear ${userName},</p>
        <p>Your registration for <strong>${eventName}</strong> has been confirmed successfully!</p>
        <p>We're excited to see you at the event. Please check your email for event updates and your ticket.</p>
        <p>Thank you for registering!</p>
        <br>
        <p>Best regards,<br>Evently Team</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `
  };

  return await sendEmail(mailOptions);
}

// Feedback invitation email function
async function sendFeedbackRequestEmail(email, userName, eventName, feedbackLink) {
  const mailOptions = {
    from: `Evently <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Share your feedback for ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f6df5; margin: 0 0 10px;">We value your feedback</h2>
        <p>Hi ${userName || 'Participant'},</p>
        <p>Thank you for attending <strong>${eventName}</strong>.</p>
        <p>Please take a minute to share your feedback.</p>
        <p style="margin: 20px 0;">
          <a href="${feedbackLink}" style="display: inline-block; padding: 12px 18px; background: #4f6df5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Submit Feedback
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">If the button does not work, use this link: ${feedbackLink}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message from Evently.</p>
      </div>
    `
  };

  return await sendEmail(mailOptions, 1);
}

module.exports = {
  buildImageAttachments,
  sendCertificateEmail,
  sendEventImagesEmail,
  sendRegistrationEmail,
  sendFeedbackRequestEmail,
  sendEmail,
  getEmailDeliveryState
};
