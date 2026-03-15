const pool = require("../config/db");

async function addParkingColumns() {
  try {
    console.log('Adding parking columns to registrations table...');
    
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parking_option VARCHAR(20)');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS time_slot VARCHAR(10)');
    
    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_registrations_parking_option ON registrations(parking_option)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_registrations_time_slot ON registrations(time_slot)');
    
    console.log('Parking columns added successfully (or already exist)');
    process.exit(0);
  } catch (error) {
    console.error('Error adding parking columns:', error);
    process.exit(1);
  }
}

addParkingColumns();
