const pool = require("../config/db");
const nodemailer = require("nodemailer");


/* ================= CREATE SUPPORT TICKET ================= */

exports.createTicket = async (req,res)=>{

try{

const {name,email,subject,message} = req.body;


/* Save ticket in database */

await pool.query(

`INSERT INTO support_tickets(name,email,subject,message)
VALUES($1,$2,$3,$4)`,

[name,email,subject,message]

);


/* Create transporter */

const transporter = nodemailer.createTransport({

service:"gmail",

auth:{
user:process.env.EMAIL_USER,
pass:process.env.EMAIL_PASS
}

});


/* Email content */

const mailOptions={

from:process.env.EMAIL_USER,

to:"shewalepiyush64@gmail.com",

subject:`New Support Ticket: ${subject}`,

html:`

<h2>New Support Ticket Received</h2>

<p><b>Name:</b> ${name}</p>
<p><b>Email:</b> ${email}</p>
<p><b>Subject:</b> ${subject}</p>

<p><b>Message:</b></p>
<p>${message}</p>

`

};


/* Send email */

await transporter.sendMail(mailOptions);


res.json({
message:"Support ticket submitted successfully"
});

}
catch(error){

console.error(error);

res.status(500).json({
error:"Failed to submit support ticket"
});

}

};