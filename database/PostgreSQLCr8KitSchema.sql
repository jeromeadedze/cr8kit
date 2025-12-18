=====
-- Cr8Kit PostgreSQL Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABLES

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'renter' CHECK (role IN ('renter', 'owner', 'both')),
    ghana_card_id VARCHAR(20),
    ghana_card_image TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    bio TEXT,
    avatar_url VARCHAR(255),
    address TEXT,
    city VARCHAR(50) DEFAULT 'Accra',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    equipment_id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('cameras', 'drones', 'lighting', 'audio', 'accessories', 'other')),
    description TEXT,
    price_per_day DECIMAL(10, 2) NOT NULL CHECK (price_per_day >= 0),
    location VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL DEFAULT 'Accra',
    image_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_rentals INTEGER DEFAULT 0 CHECK (total_rentals >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_owner_id ON equipment(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_city ON equipment(city);
CREATE INDEX IF NOT EXISTS idx_equipment_is_available ON equipment(is_available);
CREATE INDEX IF NOT EXISTS idx_equipment_rating ON equipment(rating DESC);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    renter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
    owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    booking_number VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL CHECK (total_days > 0),
    price_per_day DECIMAL(10, 2) NOT NULL CHECK (price_per_day >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled', 'rejected')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_reference VARCHAR(100),
    cancellation_reason TEXT,
    renter_notes TEXT,
    owner_notes TEXT,
    pickup_location VARCHAR(255),
    pickup_time VARCHAR(50),
    return_status VARCHAR(20) DEFAULT 'not_returned' CHECK (return_status IN ('not_returned', 'returned', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment_id ON bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_end_date ON bookings(end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);

-- Equipment Images Table
CREATE TABLE IF NOT EXISTS equipment_images (
    image_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_images_equipment_id ON equipment_images(equipment_id);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    rating_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_booking_reviewer UNIQUE (booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_id ON ratings(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewee_id ON ratings(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_equipment_id ON ratings(equipment_id);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE SET NULL,
    related_equipment_id INTEGER REFERENCES equipment(equipment_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_equipment UNIQUE (user_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_equipment_id ON favorites(equipment_id);

-- =============================================
-- TRIGGERS & FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for equipment table
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bookings table
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.email() = email);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.email() = email);

-- Allow authenticated users to insert their profile (for sign-up)
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.email() = email);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = auth.email() AND is_admin = TRUE
        )
    );

-- Allow public to view basic user info (for equipment owners)
CREATE POLICY "Public can view basic user info"
    ON users FOR SELECT
    USING (TRUE);

-- EQUIPMENT TABLE POLICIES

-- Anyone can view available equipment
CREATE POLICY "Anyone can view available equipment"
    ON equipment FOR SELECT
    USING (is_available = TRUE OR owner_id IN (
        SELECT user_id FROM users WHERE email = auth.email()
    ));

-- Equipment owners can insert their own equipment
CREATE POLICY "Owners can insert equipment"
    ON equipment FOR INSERT
    WITH CHECK (
        owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Equipment owners can update their own equipment
CREATE POLICY "Owners can update own equipment"
    ON equipment FOR UPDATE
    USING (
        owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Equipment owners can delete their own equipment
CREATE POLICY "Owners can delete own equipment"
    ON equipment FOR DELETE
    USING (
        owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- BOOKINGS TABLE POLICIES

-- Users can view bookings they're involved in (as renter or owner)
CREATE POLICY "Users can view their bookings"
    ON bookings FOR SELECT
    USING (
        renter_id IN (SELECT user_id FROM users WHERE email = auth.email())
        OR
        owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Renters can create bookings
CREATE POLICY "Renters can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (
        renter_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Users can update bookings they're involved in
CREATE POLICY "Users can update their bookings"
    ON bookings FOR UPDATE
    USING (
        renter_id IN (SELECT user_id FROM users WHERE email = auth.email())
        OR
        owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- EQUIPMENT_IMAGES TABLE POLICIES

-- Anyone can view equipment images
CREATE POLICY "Anyone can view equipment images"
    ON equipment_images FOR SELECT
    USING (TRUE);

-- Equipment owners can manage their equipment images
CREATE POLICY "Owners can manage equipment images"
    ON equipment_images FOR ALL
    USING (
        equipment_id IN (
            SELECT equipment_id FROM equipment
            WHERE owner_id IN (SELECT user_id FROM users WHERE email = auth.email())
        )
    );

-- RATINGS TABLE POLICIES

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
    ON ratings FOR SELECT
    USING (TRUE);

-- Users can create ratings for their completed bookings
CREATE POLICY "Users can create ratings"
    ON ratings FOR INSERT
    WITH CHECK (
        reviewer_id IN (SELECT user_id FROM users WHERE email = auth.email())
        AND
        booking_id IN (
            SELECT booking_id FROM bookings
            WHERE (renter_id IN (SELECT user_id FROM users WHERE email = auth.email())
                   OR owner_id IN (SELECT user_id FROM users WHERE email = auth.email()))
                   AND status = 'completed'
        )
    );

-- MESSAGES TABLE POLICIES

-- Users can view messages they're involved in
CREATE POLICY "Users can view their messages"
    ON messages FOR SELECT
    USING (
        sender_id IN (SELECT user_id FROM users WHERE email = auth.email())
        OR
        receiver_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Users can send messages
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages"
    ON messages FOR UPDATE
    USING (
        receiver_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- NOTIFICATIONS TABLE POLICIES

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (
        user_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- System can create notifications (authenticated users)
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        user_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- FAVORITES TABLE POLICIES

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
    ON favorites FOR SELECT
    USING (
        user_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Users can add favorites
CREATE POLICY "Users can add favorites"
    ON favorites FOR INSERT
    WITH CHECK (
        user_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- Users can remove their favorites
CREATE POLICY "Users can remove own favorites"
    ON favorites FOR DELETE
    USING (
        user_id IN (SELECT user_id FROM users WHERE email = auth.email())
    );

-- STORAGE BUCKETS (For Supabase Storage)

-- Note: These are created via Supabase Dashboard or CLI, not SQL
-- Listed here for reference:
-- 
-- Bucket: ghana-cards (PRIVATE)
-- - Used for Ghana Card verification images
-- - Only accessible by authenticated users
-- - Max file size: 5MB
-- 
-- Bucket: equipment-images (PUBLIC)
-- - Used for equipment photos
-- - Publicly readable
-- - Max file size: 10MB

-- HELPFUL VIEWS

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    COUNT(DISTINCT e.equipment_id) as total_equipment,
    COUNT(DISTINCT b_renter.booking_id) as total_rentals,
    COUNT(DISTINCT b_owner.booking_id) as total_bookings_received,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT r.rating_id) as total_reviews
FROM users u
LEFT JOIN equipment e ON u.user_id = e.owner_id
LEFT JOIN bookings b_renter ON u.user_id = b_renter.renter_id
LEFT JOIN bookings b_owner ON u.user_id = b_owner.owner_id
LEFT JOIN ratings r ON u.user_id = r.reviewee_id
GROUP BY u.user_id, u.full_name, u.email, u.role;

-- View for equipment with owner details
CREATE OR REPLACE VIEW equipment_with_owner AS
SELECT 
    e.*,
    u.full_name as owner_name,
    u.email as owner_email,
    u.is_verified as owner_verified,
    COUNT(DISTINCT b.booking_id) as total_bookings,
    COALESCE(AVG(r.rating), 0) as avg_rating
FROM equipment e
JOIN users u ON e.owner_id = u.user_id
LEFT JOIN bookings b ON e.equipment_id = b.equipment_id
LEFT JOIN ratings r ON e.equipment_id = r.equipment_id
GROUP BY e.equipment_id, u.full_name, u.email, u.is_verified;

-- COMMENTS

COMMENT ON TABLE users IS 'Stores user account information and profiles';
COMMENT ON TABLE equipment IS 'Stores equipment listings available for rent';
COMMENT ON TABLE bookings IS 'Stores rental bookings and their status';
COMMENT ON TABLE ratings IS 'Stores reviews and ratings for equipment and users';
COMMENT ON TABLE notifications IS 'Stores system notifications for users';
COMMENT ON TABLE favorites IS 'Stores user favorite equipment items';
