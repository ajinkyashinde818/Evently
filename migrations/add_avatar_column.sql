-- Add avatar column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);

-- Create uploads/avatars directory if it doesn't exist
-- This should be done manually or via server startup script
