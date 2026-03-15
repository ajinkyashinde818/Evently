-- Add parking configuration columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS standard_slots INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS premium_slots INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS valet_slots INTEGER DEFAULT 0;

ALTER TABLE events ADD COLUMN IF NOT EXISTS standard_price INTEGER DEFAULT 800;
ALTER TABLE events ADD COLUMN IF NOT EXISTS premium_price INTEGER DEFAULT 2000;
ALTER TABLE events ADD COLUMN IF NOT EXISTS valet_price INTEGER DEFAULT 3200;

ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_enabled BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_parking_enabled ON events(parking_enabled);
CREATE INDEX IF NOT EXISTS idx_events_standard_slots ON events(standard_slots);
CREATE INDEX IF NOT EXISTS idx_events_premium_slots ON events(premium_slots);
CREATE INDEX IF NOT EXISTS idx_events_valet_slots ON events(valet_slots);
