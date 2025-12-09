<?php
/**
 * User Login API
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Set content type to JSON
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get and sanitize input data
$email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$keepSignedIn = isset($_POST['keepSignedIn']) ? true : false;

// Validation errors array
$errors = [];

// Validate Email
if (empty($email)) {
    $errors['email'] = 'Email address is required';
} else if (!validateEmail($email)) {
    $errors['email'] = 'Please enter a valid email address';
}

// Validate Password
if (empty($password)) {
    $errors['password'] = 'Password is required';
}

// If there are validation errors, return them
if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

// Attempt to authenticate user
try {
    // Find user by email
    $stmt = $pdo->prepare("
        SELECT user_id, full_name, email, password_hash, role, is_active 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    // Check if user exists and password is correct
    if (!$user) {
        sendJSONResponse(false, 'Invalid email or password', ['errors' => ['email' => 'Invalid email or password']], 401);
    }
    
    // Check if account is active
    if (!$user['is_active']) {
        sendJSONResponse(false, 'Your account has been deactivated. Please contact support.', [], 403);
    }
    
    // Verify password
    if (!verifyPassword($password, $user['password_hash'])) {
        sendJSONResponse(false, 'Invalid email or password', ['errors' => ['email' => 'Invalid email or password']], 401);
    }
    
    // Password is correct, create session
    startSecureSession();
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['logged_in'] = true;
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_role'] = $user['role'];
    
    // Set session timeout (30 days if "keep signed in" is checked, otherwise 1 day)
    if ($keepSignedIn) {
        ini_set('session.gc_maxlifetime', 2592000); // 30 days
        $_SESSION['expires_at'] = time() + 2592000;
    } else {
        ini_set('session.gc_maxlifetime', 86400); // 1 day
        $_SESSION['expires_at'] = time() + 86400;
    }
    
    // Store session in database (optional, for tracking active sessions)
    try {
        $sessionId = session_id();
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $expiresAt = date('Y-m-d H:i:s', $_SESSION['expires_at']);
        
        $sessionStmt = $pdo->prepare("
            INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at) 
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                expires_at = VALUES(expires_at),
                ip_address = VALUES(ip_address),
                user_agent = VALUES(user_agent)
        ");
        $sessionStmt->execute([$sessionId, $user['user_id'], $ipAddress, $userAgent, $expiresAt]);
    } catch (PDOException $e) {
        // Log error but don't fail login
        error_log("Session tracking error: " . $e->getMessage());
    }
    
    // Return success response
    sendJSONResponse(true, 'Login successful!', [
        'userId' => $user['user_id'],
        'email' => $user['email'],
        'name' => $user['full_name'],
        'role' => $user['role']
    ], 200);
    
} catch (PDOException $e) {
    error_log("Login Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred during login. Please try again.', [], 500);
}

