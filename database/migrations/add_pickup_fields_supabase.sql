-- Add pickup location and time fields to bookings table
-- Run this in Supabase SQL Editor to fix the "pickup_location column not found" error

-- Add pickup fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_time VARCHAR(50);

-- Add return status field (if not already exists)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'not_returned' 
CHECK (return_status IN ('not_returned', 'returned', 'confirmed'));

-- Add cancellation reason field (if not already exists)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_location ON bookings(pickup_location);
CREATE INDEX IF NOT EXISTS idx_bookings_return_status ON bookings(return_status);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' 
AND column_name IN ('pickup_location', 'pickup_time', 'return_status', 'cancellation_reason')
ORDER BY column_name;

