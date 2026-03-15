const nodemailer = require("nodemailer");
require("dotenv").config();

const emailUser = (process.env.EMAIL_USER || "").trim();
const emailPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Email transporter verification failed:");
    console.error("Error:", error.message);
    console.error("Email configuration may be incorrect.");
    console.error("Please check EMAIL_USER and EMAIL_PASS in .env file");
  } else {
    console.log("✅ Email transporter is ready to send messages");
    console.log("📧 From:", process.env.EMAIL_USER);
  }
});

module.exports = transporter;
