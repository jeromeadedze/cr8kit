CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone_number` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(10) NOT NULL DEFAULT 'renter',
    `ghana_card_id` VARCHAR(20) NULL,
    `ghana_card_image` TEXT NULL,
    `is_verified` TINYINT(1) DEFAULT 0,
    `is_admin` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `bio` TEXT NULL,
    `avatar_url` VARCHAR(255),
    `address` TEXT,
    `city` VARCHAR(50) DEFAULT 'Accra',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user_sessions` (
    `session_id` VARCHAR(128) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `password_reset_tokens` (
    `token_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` TIMESTAMP NOT NULL,
    `used` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `equipment` (
    `equipment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `owner_id` INT NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `description` TEXT,
    `price_per_day` DECIMAL(10, 2) NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `city` VARCHAR(50) NOT NULL DEFAULT 'Accra',
    `image_url` VARCHAR(255),
    `is_verified` TINYINT(1) DEFAULT 0,
    `is_available` TINYINT(1) DEFAULT 1,
    `rating` DECIMAL(3, 1) DEFAULT 0.0,
    `total_rentals` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `bookings` (
    `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
    `renter_id` INT NOT NULL,
    `equipment_id` INT NOT NULL,
    `owner_id` INT NOT NULL,
    `booking_number` VARCHAR(20) NOT NULL UNIQUE,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_days` INT NOT NULL,
    `price_per_day` DECIMAL(10, 2) NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) DEFAULT 'pending',
    `payment_status` VARCHAR(20) DEFAULT 'pending',
    `payment_reference` VARCHAR(100),
    `cancellation_reason` TEXT,
    `renter_notes` TEXT,
    `owner_notes` TEXT,
    `pickup_location` VARCHAR(255),
    `pickup_time` VARCHAR(50),
    `return_status` VARCHAR(20) DEFAULT 'not_returned',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`renter_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`),
    FOREIGN KEY (`owner_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `equipment_images` (
    `image_id` INT AUTO_INCREMENT PRIMARY KEY,
    `equipment_id` INT NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `is_primary` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`)
);

CREATE TABLE `ratings` (
    `rating_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `reviewer_id` INT NOT NULL,
    `reviewee_id` INT NOT NULL,
    `equipment_id` INT NOT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_booking_reviewer` (`booking_id`, `reviewer_id`),
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`booking_id`),
    FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`)
);

CREATE TABLE `messages` (
    `message_id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `booking_id` INT,
    `message_text` TEXT NOT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`booking_id`)
);

CREATE TABLE `notifications` (
    `notification_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `related_booking_id` INT,
    `related_equipment_id` INT,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`related_booking_id`) REFERENCES `bookings`(`booking_id`),
    FOREIGN KEY (`related_equipment_id`) REFERENCES `equipment`(`equipment_id`)
);

CREATE TABLE `favorites` (
    `favorite_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `equipment_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_equipment` (`user_id`, `equipment_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`)
);
