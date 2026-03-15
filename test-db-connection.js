const db = require('./config/db');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].postgres_version.split(' ')[0]);
    
    // Test if we can query tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Available tables:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  No tables found. Database may need schema setup.');
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testDatabaseConnection();
