# Database Schema Analysis - Missing Elements

## Overview
Your current schema covers the core functionality well, but there are several features implemented in the codebase that require additional database tables/fields.

## ✅ What's Working Well
- Core user authentication and sessions
- Equipment listings and management
- Booking system with status tracking
- Payment status tracking
- Ratings system
- Equipment images (though you have both `equipment.image_url` and `equipment_images` table - consider standardizing)

## ❌ Missing Elements

### 1. **Favorites/Wishlist Table** ⚠️ HIGH PRIORITY
**Issue**: `toggleFavorite()` function exists in `browse.js` but no database table to persist favorites.

```sql
-- Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_equipment ON favorites(equipment_id);
```

### 2. **User Profile Extensions** ⚠️ MEDIUM PRIORITY
**Issue**: Profile page has bio field and avatar, but schema doesn't support them.

```sql
-- Add to users table:
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(50);
```

### 3. **Notifications Table** ⚠️ MEDIUM PRIORITY
**Issue**: No way to notify users about booking updates, messages, etc.

```sql
-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'booking_request', 'booking_approved', 'payment_received', etc.
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
```

### 4. **Messages/Chat Table** ⚠️ LOW PRIORITY (Future Feature)
**Issue**: No way for renters and owners to communicate.

```sql
-- Messages Table
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
```

### 5. **Booking Enhancements** ⚠️ MEDIUM PRIORITY
**Issue**: Missing fields for better booking management.

```sql
-- Add to bookings table:
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS renter_notes TEXT; -- Notes from renter when booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_notes TEXT; -- Internal notes from owner
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'held', 'released', 'forfeited'));
```

### 6. **Equipment Specifications** ⚠️ LOW PRIORITY
**Issue**: Equipment table is basic. Consider adding detailed specs.

```sql
-- Equipment Specifications Table (optional, for detailed specs)
CREATE TABLE IF NOT EXISTS equipment_specs (
    spec_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    spec_key VARCHAR(100) NOT NULL, -- e.g., 'resolution', 'weight', 'battery_life'
    spec_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specs_equipment ON equipment_specs(equipment_id);
```

### 7. **Equipment Maintenance Log** ⚠️ LOW PRIORITY (Future Feature)
**Issue**: No way to track equipment condition and maintenance.

```sql
-- Equipment Maintenance Table
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL, -- 'repair', 'cleaning', 'inspection', 'upgrade'
    description TEXT,
    cost DECIMAL(10, 2),
    performed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    maintenance_date DATE NOT NULL,
    next_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON equipment_maintenance(maintenance_date);
```

### 8. **Payment Methods Table** ⚠️ LOW PRIORITY (Future Feature)
**Issue**: No way to store user payment methods for faster checkout.

```sql
-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    payment_method_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('card', 'mobile_money', 'bank_account')),
    provider VARCHAR(50), -- 'mtn', 'vodafone', 'airteltigo', 'visa', 'mastercard'
    last_four VARCHAR(4), -- Last 4 digits of card/account
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
```

### 9. **Equipment Availability Calendar** ⚠️ LOW PRIORITY
**Issue**: Currently using bookings table to check availability. Consider dedicated table for blocked dates.

```sql
-- Equipment Availability Blocks (for maintenance, owner use, etc.)
CREATE TABLE IF NOT EXISTS equipment_availability_blocks (
    block_id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(100), -- 'maintenance', 'owner_use', 'damaged'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocks_equipment ON equipment_availability_blocks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_blocks_dates ON equipment_availability_blocks(start_date, end_date);
```

### 10. **Transaction/Payment History Table** ⚠️ MEDIUM PRIORITY
**Issue**: Better payment tracking separate from bookings.

```sql
-- Transactions Table
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
```

## 🔧 Recommended Immediate Additions

### Priority 1 (Implement Now):
1. **Favorites table** - Feature already exists in UI
2. **User bio and avatar_url** - Profile page uses these
3. **Booking cancellation_reason and notes** - Better booking management

### Priority 2 (Implement Soon):
4. **Notifications table** - Essential for user engagement
5. **Transactions table** - Better payment tracking

### Priority 3 (Future Enhancements):
6. Messages/Chat
7. Equipment specifications
8. Maintenance logs
9. Payment methods
10. Availability blocks

## 📝 Additional Recommendations

1. **Standardize Image Storage**: Decide whether to use `equipment.image_url` or `equipment_images` table exclusively, or use both (primary image in equipment table, additional in images table).

2. **Add Soft Deletes**: Consider adding `deleted_at` timestamp columns for soft deletes instead of hard deletes.

3. **Add Audit Trail**: Consider adding `created_by` and `updated_by` fields for better tracking.

4. **Add Constraints**: Consider adding CHECK constraints for date validations (e.g., end_date > start_date in bookings).

5. **Add Full-Text Search**: Consider adding full-text search indexes for equipment name and description.

