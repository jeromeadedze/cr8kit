-- Sample Data for Cr8Kit Database
-- Run this after creating the schema to populate with test data

USE cr8kit_db;

-- Insert sample users (passwords are all "Password123" hashed with bcrypt)
-- In production, these would be created through the signup process
INSERT INTO users (full_name, email, phone_number, password_hash, role, is_verified) VALUES
('Kojo Studios', 'kojo@studios.com', '+233 24 123 4567', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', TRUE),
('Lens Queen', 'lens@queen.com', '+233 24 234 5678', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', FALSE),
('Sky High', 'sky@high.com', '+233 24 345 6789', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', FALSE),
('Audio Pro', 'audio@pro.com', '+233 24 456 7890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', FALSE),
('Motion Gh', 'motion@gh.com', '+233 24 567 8901', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', FALSE),
('Test Renter', 'renter@test.com', '+233 24 678 9012', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'renter', FALSE);

-- Insert sample equipment
INSERT INTO equipment (owner_id, name, category, description, price_per_day, location, city, image_url, is_verified, rating, total_rentals) VALUES
(1, 'Sony A7S III Body', 'Cameras', 'Professional full-frame mirrorless camera. Perfect for video and low-light photography. Includes battery and charger.', 450.00, 'Osu, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/sony-a7s-iii', TRUE, 4.9, 12),
(1, 'Canon RF 24-70mm f/2.8L', 'Cameras', 'Professional zoom lens with image stabilization. Excellent for portraits and events.', 220.00, 'Cantonments, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/canon-rf-24-70', TRUE, 5.0, 8),
(2, 'Aputure 300d II Set', 'Lighting', 'LED light with softbox and stand. Perfect for studio and location shoots.', 300.00, 'East Legon, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/aputure-300d', FALSE, 5.0, 5),
(3, 'DJI Mavic 3 Cine', 'Drones', 'Professional cinema drone with 4K camera. Includes extra batteries and carrying case.', 850.00, 'Kumasi Central', 'Kumasi', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-mavic-3', FALSE, 4.8, 15),
(4, 'Rode NTG3 Shotgun Mic', 'Audio', 'Professional shotgun microphone with boom pole and shock mount. Great for interviews and film production.', 150.00, 'Tema', 'Tema', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/rode-ntg3', FALSE, 4.7, 7),
(5, 'DJI Ronin RS3 Pro', 'Accessories', 'Professional 3-axis gimbal stabilizer for cameras. Supports up to 4.5kg payload.', 350.00, 'Spintex, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-ronin-rs3', FALSE, 4.7, 10),
(1, 'Sony FE 85mm f/1.4 GM', 'Cameras', 'Premium portrait lens with beautiful bokeh. Perfect for portraits and weddings.', 180.00, 'Osu, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/sony-85mm', TRUE, 4.9, 20),
(2, 'Godox AD200 Pro', 'Lighting', 'Portable flash with battery. Great for outdoor shoots and events.', 120.00, 'East Legon, Accra', 'Accra', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/godox-ad200', FALSE, 4.6, 9),
(3, 'DJI Mini 3 Pro', 'Drones', 'Compact drone with 4K camera. Perfect for travel and small productions.', 250.00, 'Kumasi Central', 'Kumasi', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-mini-3', FALSE, 4.8, 18),
(4, 'Zoom H6 Recorder', 'Audio', '6-channel audio recorder with interchangeable microphone capsules.', 200.00, 'Tema', 'Tema', 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/zoom-h6', FALSE, 4.5, 6);

-- Insert sample equipment images (primary images)
INSERT INTO equipment_images (equipment_id, image_url, is_primary) VALUES
(1, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/sony-a7s-iii', 1),
(2, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/canon-rf-24-70', 1),
(3, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/aputure-300d', 1),
(4, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-mavic-3', 1),
(5, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/rode-ntg3', 1),
(6, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-ronin-rs3', 1),
(7, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/sony-85mm', 1),
(8, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/godox-ad200', 1),
(9, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/dji-mini-3', 1),
(10, 'https://res.cloudinary.com/dpfsqrccq/image/upload/v1/cr8kit/equipment/zoom-h6', 1);

-- Note: Password hash is for "Password123" - use this to test login
-- All sample users can log in with email and password "Password123"

