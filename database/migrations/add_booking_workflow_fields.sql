-- Add booking workflow fields for pickup details and return status
-- Run this migration to add the new fields

-- Add pickup and return fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_time VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'not_returned' 
    CHECK (return_status IN ('not_returned', 'returned', 'confirmed'));

-- Update status enum to include 'returned' if needed (PostgreSQL)
-- Note: For PostgreSQL, you may need to use ALTER TYPE if status is an enum
-- For Supabase (which uses VARCHAR with CHECK), the status field already supports any string

-- Add index for return_status for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_return_status ON bookings(return_status);

-- Add index for pickup location queries
CREATE INDEX IF NOT EXISTS idx_bookings_pickup ON bookings(pickup_location);

