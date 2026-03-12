const db = require("../config/db");

exports.getDashboard = async (req, res) => {

try{

/* ================= TOTAL EVENTS ================= */

const totalEvents = await db.query(`
SELECT COUNT(*)::int AS count FROM events
`);


/* ================= UPCOMING EVENTS ================= */

// Count only events explicitly marked as 'upcoming'
const upcomingEvents = await db.query(`
SELECT COUNT(*)::int AS count
FROM events
WHERE status = 'upcoming'
`);


/* ================= COMPLETED EVENTS ================= */

const completedEvents = await db.query(`
SELECT COUNT(*)::int AS count
FROM events
WHERE status='completed'
`);


/* ================= TOTAL PARTICIPANTS ================= */

const participants = await db.query(`
SELECT COUNT(*)::int AS count
FROM registrations r
JOIN events e ON r.event_id = e.id
`);


/* ================= ALL EVENTS ================= */

const events = await db.query(`
SELECT
id,
title,
COALESCE(city,'Unknown') AS city,
status,
start_date,
end_date,
venue,
description,
banner_image
FROM events
ORDER BY id DESC
`);


/* ================= TODAY REGISTRATIONS ================= */

const todayRegistrations = await db.query(`
SELECT
r.name,
e.title,
CASE
WHEN r.checked_in=true THEN 'Checked In'
ELSE 'Pending'
END AS status
FROM registrations r
JOIN events e ON r.event_id=e.id
WHERE DATE(r.created_at)=CURRENT_DATE
ORDER BY r.created_at DESC
`);


/* ================= REGISTRATION TREND (LAST 7 DAYS) ================= */

const trend = await db.query(`
SELECT
DATE(created_at) AS date,
COUNT(*)::int AS count
FROM registrations
WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at)
`);


/* ================= EVENT STATUS ANALYTICS ================= */

const analytics = await db.query(`
SELECT
status,
COUNT(*)::int AS count
FROM events
GROUP BY status
`);


/* ================= RESPONSE ================= */

res.json({

totalEvents: totalEvents.rows[0].count,
upcomingEvents: upcomingEvents.rows[0].count,
completedEvents: completedEvents.rows[0].count,
participants: participants.rows[0].count,

events: events.rows,
todayRegistrations: todayRegistrations.rows,

trend: trend.rows,
analytics: analytics.rows

});

}catch(err){

console.log("Dashboard error:",err);

res.status(500).json({
error:"Dashboard error"
});

}

};