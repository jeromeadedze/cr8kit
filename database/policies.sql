-- Enable Row Level Security (RLS) on tables
-- FIX: Dropping existing policies to avoid name collisions
-- FIX: Using auth.jwt() ->> 'email' to avoid permission issues reading auth.users table directly

-- 1. USERS TABLE SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone" 
ON users FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (
  email = (auth.jwt() ->> 'email')
);

-- 2. EQUIPMENT TABLE SECURITY
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipment is viewable by everyone" ON equipment;
CREATE POLICY "Equipment is viewable by everyone" 
ON equipment FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own equipment" ON equipment;
CREATE POLICY "Users can insert their own equipment" 
ON equipment FOR INSERT 
WITH CHECK (
  owner_id IN (
    SELECT user_id FROM users 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "Owners can update own equipment" ON equipment;
CREATE POLICY "Owners can update own equipment" 
ON equipment FOR UPDATE 
USING (
  owner_id IN (
    SELECT user_id FROM users 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "Owners can delete own equipment" ON equipment;
CREATE POLICY "Owners can delete own equipment" 
ON equipment FOR DELETE 
USING (
  owner_id IN (
    SELECT user_id FROM users 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- 3. BOOKINGS TABLE SECURITY
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" 
ON bookings FOR SELECT 
USING (
  renter_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
  OR 
  owner_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "Renters can create bookings" ON bookings;
CREATE POLICY "Renters can create bookings" 
ON bookings FOR INSERT 
WITH CHECK (
  renter_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "Parties can update booking status" ON bookings;
CREATE POLICY "Parties can update booking status" 
ON bookings FOR UPDATE 
USING (
  renter_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
  OR 
  owner_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
);

-- 4. RATINGS TABLE SECURITY
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON ratings;
CREATE POLICY "Ratings are viewable by everyone" 
ON ratings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can rate" ON ratings;
CREATE POLICY "Authenticated users can rate" 
ON ratings FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. NOTIFICATIONS SECURITY
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (
  user_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (
  user_id IN (
    SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
  )
);


-- 6. EQUIPMENT IMAGES SECURITY
ALTER TABLE equipment_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Images are viewable by everyone" ON equipment_images;
CREATE POLICY "Images are viewable by everyone" 
ON equipment_images FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Owners can manage images" ON equipment_images;
CREATE POLICY "Owners can manage images" 
ON equipment_images FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM equipment 
    WHERE equipment.equipment_id = equipment_images.equipment_id 
    AND equipment.owner_id IN (
      SELECT user_id FROM users WHERE email = (auth.jwt() ->> 'email')
    )
  )
);
