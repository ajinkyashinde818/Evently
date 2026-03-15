-- Add parking columns to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parking_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parking_price INTEGER DEFAULT 0;

-- Add check constraint for parking_type
ALTER TABLE registrations ADD CONSTRAINT chk_registrations_parking_type 
    CHECK (parking_type IN ('none', 'standard', 'premium', 'valet'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_parking_type ON registrations(parking_type);
CREATE INDEX IF NOT EXISTS idx_registrations_parking_price ON registrations(parking_price);
CREATE INDEX IF NOT EXISTS idx_registrations_event_parking ON registrations(event_id, parking_type);
