
console.log("Registration Controller Loaded");
const db = require("../config/db");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const transporter = require("../config/mail");
const { v4: uuidv4 } = require("uuid");


/* ================= REGISTER USER ================= */

const registerUser = async (req,res)=>{

try{
const { name, email, phone } = req.body;
const eventId = req.params.eventId;

/* GENERATE TICKET ID */

const ticketId = `EVT-${uuidv4().split("-")[0].toUpperCase()}`;


/* GET EVENT */

const event = await db.query(
`SELECT title FROM events WHERE id=$1`,
[eventId]
);

if(event.rows.length === 0){
return res.status(404).json({error:"Event not found"});
}

const eventData = event.rows[0];


/* SAVE REGISTRATION */

await db.query(

`INSERT INTO registrations
(event_id,name,email,phone,ticket_id,checked_in)
VALUES($1,$2,$3,$4,$5,false)`,

[eventId,name,email,phone,ticketId]

);


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

doc.on("data",(chunk)=>buffers.push(chunk));

doc.on("end",async()=>{

const pdfData = Buffer.concat(buffers);

try{

await transporter.sendMail({

from:`Evently <${process.env.EMAIL_USER}>`,
to:email,
subject:"Your Event Ticket",

html:`
<h2>Your Event Ticket</h2>
<p>Your registration for <b>${eventData.title}</b> is confirmed.</p>
<p>Ticket ID: <b>${ticketId}</b></p>
<p>Your ticket is attached.</p>
`,

attachments:[
{
filename:"ticket.pdf",
content:pdfData
}
]

});

}catch(err){
console.log("Email error:",err);
}

res.json({
message:"Registration successful",
ticketId
});

});


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

doc.text(`Name: ${name}`, { align: "center" });

doc.moveDown(0.5);

doc.text(`Email: ${email}`, { align: "center" });

doc.moveDown(0.5);

doc.text(`Phone: ${phone}`, { align: "center" });

doc.moveDown(0.5);

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

/* move cursor below QR */
doc.y = qrY + qrSize + 30;


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

}catch(err){

console.log(err);

res.status(500).json({
error:"Registration failed"
});

}

};


/* ================= GET ALL REGISTRATIONS ================= */

const getAllRegistrations = async (req,res)=>{

try{

const result = await db.query(

`SELECT
registrations.id,
registrations.name,
registrations.email,
registrations.phone,
registrations.ticket_id,
registrations.checked_in,
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

const result = await db.query(

`SELECT *
FROM registrations
WHERE event_id=$1
ORDER BY id DESC`,

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

const result = await db.query(

`SELECT name,checked_in
FROM registrations
WHERE ticket_id=$1`,

[ticketId]

);

if(result.rows.length === 0){
return res.status(404).json({error:"Invalid ticket"});
}

if(result.rows[0].checked_in){
return res.status(400).json({error:"Ticket already checked-in"});
}

await db.query(

`UPDATE registrations
SET checked_in=true
WHERE ticket_id=$1`,

[ticketId]

);

res.json({
message:"Check-in successful",
user:{ name:result.rows[0].name }
});

}catch(err){

console.log(err);
res.status(500).json({error:"Check-in failed"});

}

};


/* EXPORT CONTROLLERS */

module.exports = {
registerUser,
getAllRegistrations,
getEventRegistrations,
checkInUser
};