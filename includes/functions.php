<?php
/**
 * Utility Functions
 * Cr8Kit - Ghana Creative Rentals Platform
 */

/**
 * Sanitize input data
 * @param string $data Input data to sanitize
 * @return string Sanitized data
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Validate email format
 * @param string $email Email address to validate
 * @return bool True if valid, false otherwise
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate Ghana phone number
 * Supports formats: +233XXXXXXXXX, 0XXXXXXXXX, 233XXXXXXXXX
 * @param string $phone Phone number to validate
 * @return bool True if valid, false otherwise
 */
function validateGhanaPhone($phone) {
    // Remove spaces and dashes
    $cleanedPhone = preg_replace('/[\s-]/', '', $phone);
    
    // Regex patterns for Ghana phone numbers
    $patterns = [
        '/^\+233[0-9]{9}$/',           // +233XXXXXXXXX (9 digits after country code)
        '/^0[0-9]{9}$/',              // 0XXXXXXXXX (10 digits starting with 0)
        '/^233[0-9]{9}$/'             // 233XXXXXXXXX (11 digits starting with 233)
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $cleanedPhone)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Validate password strength
 * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 * @param string $password Password to validate
 * @return array ['valid' => bool, 'message' => string]
 */
function validatePassword($password) {
    if (strlen($password) < 8) {
        return ['valid' => false, 'message' => 'Password must be at least 8 characters long'];
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        return ['valid' => false, 'message' => 'Password must contain at least one uppercase letter'];
    }
    
    if (!preg_match('/[a-z]/', $password)) {
        return ['valid' => false, 'message' => 'Password must contain at least one lowercase letter'];
    }
    
    if (!preg_match('/[0-9]/', $password)) {
        return ['valid' => false, 'message' => 'Password must contain at least one number'];
    }
    
    return ['valid' => true, 'message' => ''];
}

/**
 * Validate full name (at least 2 words, 2-50 characters each)
 * @param string $name Full name to validate
 * @return array ['valid' => bool, 'message' => string]
 */
function validateFullName($name) {
    $trimmedName = trim($name);
    
    if (strlen($trimmedName) < 3) {
        return ['valid' => false, 'message' => 'Name must be at least 3 characters long'];
    }
    
    if (!preg_match('/^[a-zA-Z\s]{2,50}(\s[a-zA-Z\s]{2,50})+$/', $trimmedName)) {
        return ['valid' => false, 'message' => 'Please enter your full name (first and last name)'];
    }
    
    return ['valid' => true, 'message' => ''];
}

/**
 * Hash password using bcrypt
 * @param string $password Plain text password
 * @return string Hashed password
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verify password against hash
 * @param string $password Plain text password
 * @param string $hash Hashed password
 * @return bool True if password matches, false otherwise
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Check if email already exists in database
 * @param string $email Email to check
 * @param PDO $pdo Database connection
 * @return bool True if exists, false otherwise
 */
function emailExists($email, $pdo) {
    try {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch() !== false;
    } catch (PDOException $e) {
        error_log("Error checking email: " . $e->getMessage());
        return false;
    }
}

/**
 * Check if phone number already exists in database
 * @param string $phone Phone number to check
 * @param PDO $pdo Database connection
 * @return bool True if exists, false otherwise
 */
function phoneExists($phone, $pdo) {
    try {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE phone_number = ?");
        $stmt->execute([$phone]);
        return $stmt->fetch() !== false;
    } catch (PDOException $e) {
        error_log("Error checking phone: " . $e->getMessage());
        return false;
    }
}

/**
 * Start secure session
 */
function startSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Configure session security
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
        ini_set('session.cookie_samesite', 'Strict');
        
        session_start();
    }
}

/**
 * Check if user is logged in
 * @return bool True if logged in, false otherwise
 */
function isLoggedIn() {
    startSecureSession();
    return isset($_SESSION['user_id']) && isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

/**
 * Get current user ID
 * @return int|null User ID or null if not logged in
 */
function getCurrentUserId() {
    if (isLoggedIn()) {
        return $_SESSION['user_id'];
    }
    return null;
}

/**
 * Logout user
 */
function logout() {
    startSecureSession();
    $_SESSION = array();
    
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    session_destroy();
}

/**
 * Send JSON response
 * @param bool $success Success status
 * @param string $message Response message
 * @param array $data Additional data to include
 * @param int $httpCode HTTP status code
 */
function sendJSONResponse($success, $message, $data = [], $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if (!empty($data)) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

