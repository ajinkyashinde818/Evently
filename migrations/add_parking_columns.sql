-- Add parking slot booking columns to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parking_option VARCHAR(20);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS time_slot VARCHAR(10);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_parking_option ON registrations(parking_option);
CREATE INDEX IF NOT EXISTS idx_registrations_time_slot ON registrations(time_slot);
