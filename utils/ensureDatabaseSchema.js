const db = require("../config/db");

async function ensureDatabaseSchema() {
  try {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)
    `);

    await db.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false
    `);

    await db.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS parking_type VARCHAR(20) DEFAULT 'none'
    `);

    await db.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS parking_price INTEGER DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS time_slot VARCHAR(10)
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS banner_image TEXT
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS parking_enabled BOOLEAN DEFAULT false
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS standard_slots INTEGER DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS premium_slots INTEGER DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS valet_slots INTEGER DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS standard_price INTEGER DEFAULT 800
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS premium_price INTEGER DEFAULT 2000
    `);

    await db.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS valet_price INTEGER DEFAULT 3200
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS parking_bookings (
        id SERIAL PRIMARY KEY,
        registration_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        parking_type VARCHAR(20) NOT NULL CHECK (parking_type IN ('none', 'standard', 'premium', 'valet')),
        price INTEGER NOT NULL DEFAULT 0,
        slot_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      ALTER TABLE parking_bookings
      ADD COLUMN IF NOT EXISTS slot_number VARCHAR(50)
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_parking_bookings_registration'
        ) THEN
          ALTER TABLE parking_bookings
          ADD CONSTRAINT fk_parking_bookings_registration
          FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_parking_bookings_event'
        ) THEN
          ALTER TABLE parking_bookings
          ADD CONSTRAINT fk_parking_bookings_event
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_parking_bookings_registration_id
      ON parking_bookings(registration_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_parking_bookings_event_id
      ON parking_bookings(event_id)
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_feedback (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        registration_id INTEGER,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        feedback TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_event_feedback_event'
        ) THEN
          ALTER TABLE event_feedback
          ADD CONSTRAINT fk_event_feedback_event
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_event_feedback_registration'
        ) THEN
          ALTER TABLE event_feedback
          ADD CONSTRAINT fk_event_feedback_registration
          FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_event_feedback_event_email'
        ) THEN
          ALTER TABLE event_feedback
          ADD CONSTRAINT uq_event_feedback_event_email
          UNIQUE (event_id, email);
        END IF;
      END $$;
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id
      ON event_feedback(event_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_event_feedback_created_at
      ON event_feedback(created_at DESC)
    `);

    console.log("Database schema verified successfully");
  } catch (error) {
    console.error("Database schema verification failed:", error.message);
    throw error;
  }
}

module.exports = ensureDatabaseSchema;
