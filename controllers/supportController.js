const pool = require("../config/db");
const { sendEmail, getEmailDeliveryState } = require("../utils/emailService");


/* ================= CREATE SUPPORT TICKET ================= */

exports.createTicket = async (req,res)=>{

try{

const {name,email,subject,message} = req.body;
const trimmedName = (name || "").trim();
const trimmedEmail = (email || "").trim().toLowerCase();
const trimmedSubject = (subject || "").trim();
const trimmedMessage = (message || "").trim();

if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
return res.status(400).json({
error:"All support ticket fields are required"
});
}


/* Save ticket in database */

await pool.query(

`INSERT INTO support_tickets(name,email,subject,message)
VALUES($1,$2,$3,$4)`,

[trimmedName,trimmedEmail,trimmedSubject,trimmedMessage]

);

/* Email content */

const mailOptions={

from:process.env.EMAIL_USER,

to:"shewalepiyush64@gmail.com",

subject:`New Support Ticket: ${trimmedSubject}`,

html:`

<h2>New Support Ticket Received</h2>

<p><b>Name:</b> ${trimmedName}</p>
<p><b>Email:</b> ${trimmedEmail}</p>
<p><b>Subject:</b> ${trimmedSubject}</p>

<p><b>Message:</b></p>
<p>${trimmedMessage}</p>

`

};


/* Send email if available, but do not fail the saved ticket if mail is blocked */

const emailDeliveryState = getEmailDeliveryState();
let supportEmailSent = false;
let supportEmailMessage = "Support ticket submitted successfully";

if (emailDeliveryState.available) {
const emailResult = await sendEmail(mailOptions, 0);
supportEmailSent = !!emailResult.success;

if (!emailResult.success) {
  console.error("Support ticket email could not be delivered:", emailResult.error);
  supportEmailMessage = "Support ticket saved successfully, but email delivery is temporarily unavailable.";
}
} else {
supportEmailMessage = "Support ticket saved successfully, but email delivery is temporarily unavailable.";
}


res.json({
message:supportEmailMessage,
emailDeliveryAvailable:supportEmailSent
});

}
catch(error){

console.error(error);

res.status(500).json({
error:"Failed to submit support ticket"
});

}

};
