<?php
/**
 * Supabase Database Configuration File
 * Cr8Kit - Ghana Creative Rentals Platform
 * 
 * Instructions:
 * 1. Get your Supabase connection string from: Settings → Database → Connection string
 * 2. Replace the values below with your Supabase credentials
 * 3. Rename this file to database.php (or update includes to use this file)
 */

// Supabase Database configuration
// Project URL: https://ibvzepzwoytvhrnllywi.supabase.co
define('DB_HOST', 'db.ibvzepzwoytvhrnllywi.supabase.co');
define('DB_NAME', 'postgres');
define('DB_PORT', '5432');
define('DB_USER', 'postgres');
define('DB_PASS', 'zVavDyni50GafwK2'); // Get from Supabase Dashboard → Settings → Database → Database password
define('DB_CHARSET', 'utf8');

// Supabase API Keys (for future use with Supabase JS client)
define('SUPABASE_URL', 'https://ibvzepzwoytvhrnllywi.supabase.co');
define('SUPABASE_KEY', 'sb_publishable_JmXilJQxPlILiiX7_auZTA_nO0ga4jt');
define('SUPABASE_SECRET', 'sb_secret_Sai205FhS0oQh5TBxexdew_Ci-C8d_x');

// Alternative: Use connection URI directly
// Format: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
define('DB_URI', ''); // Leave empty to use individual settings above

/**
 * Create Supabase (PostgreSQL) database connection
 * @return PDO|null Returns PDO connection or null on failure
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            // Use connection URI if provided, otherwise build from individual settings
            if (!empty(DB_URI)) {
                $dsn = DB_URI;
            } else {
                $dsn = sprintf(
                    "pgsql:host=%s;port=%s;dbname=%s",
                    DB_HOST,
                    DB_PORT,
                    DB_NAME
                );
            }
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => false, // Don't use persistent connections
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            
        } catch (PDOException $e) {
            error_log("Supabase Connection Error: " . $e->getMessage());
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

