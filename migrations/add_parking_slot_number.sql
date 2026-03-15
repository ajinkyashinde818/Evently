-- Add parking slot number to parking_bookings table
ALTER TABLE parking_bookings 
ADD COLUMN slot_number VARCHAR(20) UNIQUE;

-- Create a sequence for generating unique slot numbers per event type
CREATE SEQUENCE IF NOT EXISTS parking_slot_sequence;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_parking_bookings_slot ON parking_bookings(slot_number);
