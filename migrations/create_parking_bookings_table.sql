-- Create parking_bookings table
CREATE TABLE IF NOT EXISTS parking_bookings (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    parking_type VARCHAR(20) NOT NULL CHECK (parking_type IN ('none', 'standard', 'premium', 'valet')),
    price INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create foreign key constraints
ALTER TABLE parking_bookings ADD CONSTRAINT fk_parking_bookings_registration 
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE;
    
ALTER TABLE parking_bookings ADD CONSTRAINT fk_parking_bookings_event 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parking_bookings_registration_id ON parking_bookings(registration_id);
CREATE INDEX IF NOT EXISTS idx_parking_bookings_event_id ON parking_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_parking_bookings_parking_type ON parking_bookings(parking_type);
CREATE INDEX IF NOT EXISTS idx_parking_bookings_created_at ON parking_bookings(created_at);

-- Create unique constraint to prevent duplicate parking bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_bookings_unique_registration 
    ON parking_bookings(registration_id) WHERE parking_type != 'none';
