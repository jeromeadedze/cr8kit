-- Cr8Kit Database Schema Additions
-- Missing tables and fields based on implemented features
-- Run this after your main schema

-- ============================================
-- PRIORITY 1: Immediate Additions
-- ============================================

-- 1. Favorites/Wishlist Table
-- Required for toggleFavorite() function in browse.js
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_equipment ON favorites(equipment_id);

-- 2. Add User Profile Fields
-- Required for profile page (bio, avatar)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(50) DEFAULT 'Accra';

-- 3. Enhance Bookings Table
-- Better booking management
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS renter_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (deposit_status IN ('pending', 'held', 'released', 'forfeited'));

-- ============================================
-- PRIORITY 2: Important Additions
-- ============================================

-- 4. Notifications Table
-- For user notifications about bookings, messages, etc.
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'booking_request', 'booking_approved', 'payment_received', 'message', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE SET NULL,
    related_equipment_id INTEGER REFERENCES equipment(equipment_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 5. Transactions Table
-- Better payment tracking separate from bookings
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'deposit', 'deposit_refund')),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    gateway_response TEXT, -- Store full response from payment gateway
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ============================================
-- PRIORITY 3: Future Enhancements (Optional)
-- ============================================

-- 6. Messages/Chat Table (Optional - for future messaging feature)
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE SET NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(receiver_id, is_read);

-- 7. Equipment Availability Blocks (Optional - for maintenance, owner use)
CREATE TABLE IF NOT EXISTS equipment_availability_blocks (
    block_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(100), -- 'maintenance', 'owner_use', 'damaged'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_blocks_equipment ON equipment_availability_blocks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_blocks_dates ON equipment_availability_blocks(start_date, end_date);

-- 8. Equipment Specifications (Optional - for detailed specs)
CREATE TABLE IF NOT EXISTS equipment_specs (
    spec_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    spec_key VARCHAR(100) NOT NULL, -- e.g., 'resolution', 'weight', 'battery_life'
    spec_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specs_equipment ON equipment_specs(equipment_id);

-- ============================================
-- Additional Constraints and Improvements
-- ============================================

-- Add constraint to ensure end_date > start_date in bookings
ALTER TABLE bookings ADD CONSTRAINT IF NOT EXISTS check_booking_dates 
    CHECK (end_date > start_date);

-- Add constraint to ensure total_amount calculation is correct
-- (This is a soft check - actual calculation should be done in application)
ALTER TABLE bookings ADD CONSTRAINT IF NOT EXISTS check_total_amount 
    CHECK (total_amount >= price_per_day);

-- Add updated_at trigger for new tables
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Notes
-- ============================================
-- 
-- To apply these changes:
-- 1. Run Priority 1 additions immediately (favorites, user fields, booking enhancements)
-- 2. Run Priority 2 when ready (notifications, transactions)
-- 3. Run Priority 3 as needed (messages, availability blocks, specs)
--
-- Test each section before moving to the next.
-- Backup your database before running migrations.

