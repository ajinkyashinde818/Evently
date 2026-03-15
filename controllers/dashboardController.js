const db = require("../config/db");

exports.getDashboard = async (req, res) => {

try{

/* ================= TOTAL EVENTS ================= */

const totalEvents = await db.query(`
SELECT COUNT(*)::int AS count FROM events
WHERE status != 'deleted'
`);


/* ================= UPCOMING EVENTS ================= */

// Count only events explicitly marked as 'upcoming'
const upcomingEvents = await db.query(`
SELECT COUNT(*)::int AS count
FROM events
WHERE status = 'upcoming'
AND status != 'deleted'
`);


/* ================= COMPLETED EVENTS ================= */

const completedEvents = await db.query(`
SELECT COUNT(*)::int AS count
FROM events
WHERE status='completed'
AND status != 'deleted'
`);


/* ================= TOTAL PARTICIPANTS ================= */

const participants = await db.query(`
SELECT COUNT(*)::int AS count
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE e.status != 'deleted'
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
WHERE status != 'deleted'
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
AND e.status != 'deleted'
ORDER BY r.created_at DESC
`);


/* ================= REGISTRATION TREND (ALL AVAILABLE DAYS) ================= */

const trend = await db.query(`
SELECT
DATE(created_at) AS date,
COUNT(*)::int AS count
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE e.status != 'deleted'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at)
`);

const trendMap = new Map(
trend.rows.map((row) => {
  const dateKey = new Date(row.date).toISOString().slice(0, 10);
  return [dateKey, Number(row.count)];
})
);

const filledTrend = [];

if (trend.rows.length > 0) {
  const firstTrendDate = new Date(trend.rows[0].date);
  firstTrendDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = new Date(firstTrendDate); day <= today; day.setDate(day.getDate() + 1)) {
    const dateKey = day.toISOString().slice(0, 10);

    filledTrend.push({
      date: dateKey,
      count: trendMap.get(dateKey) || 0
    });
  }
}


/* ================= EVENT STATUS ANALYTICS ================= */

const analytics = await db.query(`
SELECT
status,
COUNT(*)::int AS count
FROM events
WHERE status != 'deleted'
GROUP BY status
`);


/* ================= PARKING ANALYTICS FOR EVENTS ================= */

const eventsWithParking = await db.query(`
SELECT 
e.id,
e.title,
e.parking_enabled,
e.standard_price,
e.premium_price,
e.valet_price,
COUNT(DISTINCT pb.id)::int AS total_booked,
COUNT(DISTINCT CASE WHEN pb.parking_type = 'standard' THEN pb.id END)::int AS standard_booked,
COUNT(DISTINCT CASE WHEN pb.parking_type = 'premium' THEN pb.id END)::int AS premium_booked,
COUNT(DISTINCT CASE WHEN pb.parking_type = 'valet' THEN pb.id END)::int AS valet_booked
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
LEFT JOIN parking_bookings pb ON r.id = pb.registration_id
WHERE e.status != 'deleted'
GROUP BY e.id, e.title, e.parking_enabled, e.standard_price, e.premium_price, e.valet_price
ORDER BY e.id DESC
`);


/* ================= RESPONSE ================= */

res.json({

totalEvents: totalEvents.rows[0].count,
upcomingEvents: upcomingEvents.rows[0].count,
completedEvents: completedEvents.rows[0].count,
participants: participants.rows[0].count,

events: events.rows,
todayRegistrations: todayRegistrations.rows,

trend: filledTrend,
analytics: analytics.rows,
parkingAnalytics: eventsWithParking.rows

});

}catch(err){

console.log("Dashboard error:",err);

res.status(500).json({
error:"Dashboard error"
});

}

};
