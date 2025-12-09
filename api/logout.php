<?php
/**
 * User Logout API
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
if ($pdo) {
    try {
        // Remove session from database
        $sessionId = session_id();
        if ($sessionId) {
            $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE session_id = ?");
            $stmt->execute([$sessionId]);
        }
    } catch (PDOException $e) {
        error_log("Logout session cleanup error: " . $e->getMessage());
    }
}

// Logout user
logout();

sendJSONResponse(true, 'Logged out successfully', [], 200);

