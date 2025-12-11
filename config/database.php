<?php
/**
 * Database Configuration File
 * Cr8Kit - Ghana Creative Rentals Platform
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'cr8kit_db');
define('DB_USER', 'root'); // Change this to your MySQL username
define('DB_PASS', ''); // Change this to your MySQL password
define('DB_CHARSET', 'utf8mb4');

/**
 * Create database connection
 * @return PDO|null Returns PDO connection or null on failure
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            // Try multiple connection methods for XAMPP compatibility
            $connectionMethods = [
                // Method 1: Standard localhost connection
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
                // Method 2: 127.0.0.1 connection
                "mysql:host=127.0.0.1;dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
                // Method 3: XAMPP socket path
                "mysql:unix_socket=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock;dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            ];
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $lastError = null;
            foreach ($connectionMethods as $dsn) {
                try {
                    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                    // Connection successful, break out of loop
                    break;
                } catch (PDOException $e) {
                    $lastError = $e;
                    // Try next method
                    continue;
                }
            }
            
            // If all methods failed, throw the last error
            if ($pdo === null) {
                throw $lastError;
            }
            
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            return null;
        }
    }
    
    return $pdo;
}

/**
 * Test database connection
 * @return bool True if connection successful, false otherwise
 */
function testDBConnection() {
    $pdo = getDBConnection();
    return $pdo !== null;
}

