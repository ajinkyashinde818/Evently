const { Pool } = require("pg");
require("dotenv").config();

// Use Railway DATABASE_URL if available, otherwise use individual connection parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect()
.then(() => {
  if (process.env.DATABASE_URL) {
    console.log("Railway PostgreSQL database connected successfully ");
  } else {
    console.log("Local PostgreSQL database connected successfully ");
  }
})
.catch(err => console.error("Database connection failed ", err));

module.exports = pool;