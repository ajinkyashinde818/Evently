const pool = require("../config/db");

async function runParkingMigrations() {
  try {
    console.log('Running parking system migrations...');

    // Run events table migration
    const eventsMigration = require('./migrations/add_parking_to_events.sql');
    await pool.query(eventsMigration);
    console.log('✓ Events table updated with parking columns');

    // Run parking_bookings table migration
    const parkingBookingsMigration = require('./migrations/create_parking_bookings_table.sql');
    await pool.query(parkingBookingsMigration);
    console.log('✓ Parking bookings table created');

    // Run registrations table migration
    const registrationsMigration = require('./migrations/add_parking_to_registrations.sql');
    await pool.query(registrationsMigration);
    console.log('✓ Registrations table updated with parking columns');

    console.log('🎉 All parking system migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runParkingMigrations();
