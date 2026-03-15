const pool = require("../config/db");

async function addAvatarColumn() {
  try {
    console.log('Adding avatar column to users table...');
    
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)');
    
    console.log('Avatar column added successfully (or already exists)');
    process.exit(0);
  } catch (error) {
    console.error('Error adding avatar column:', error);
    process.exit(1);
  }
}

addAvatarColumn();
