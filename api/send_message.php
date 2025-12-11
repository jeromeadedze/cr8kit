<?php
/**
 * Send Message API
 * Allows users to send messages to each other
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Set content type to JSON
header('Content-Type: application/json');

// Check authentication
startSecureSession();
if (!isLoggedIn()) {
    sendJSONResponse(false, 'Authentication required', [], 401);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get current user
$userId = getCurrentUserId();

// Get input
$receiverId = isset($_POST['receiver_id']) ? intval($_POST['receiver_id']) : 0;
$messageText = isset($_POST['message']) ? sanitizeInput($_POST['message']) : '';
$bookingId = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : null;

// Validation
$errors = [];

if ($receiverId <= 0) {
    $errors['receiver_id'] = 'Invalid receiver ID';
}

if (empty($messageText)) {
    $errors['message'] = 'Message cannot be empty';
} else if (strlen($messageText) > 5000) {
    $errors['message'] = 'Message is too long (max 5000 characters)';
}

if ($userId == $receiverId) {
    $errors['receiver_id'] = 'You cannot send a message to yourself';
}

if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

try {
    // Verify receiver exists
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $stmt->execute([$receiverId]);
    if (!$stmt->fetch()) {
        sendJSONResponse(false, 'Receiver not found', [], 404);
    }
    
    // If booking_id provided, verify user is part of the booking
    if ($bookingId !== null) {
        $stmt = $pdo->prepare("
            SELECT renter_id, owner_id 
            FROM bookings 
            WHERE booking_id = ? AND (renter_id = ? OR owner_id = ?)
        ");
        $stmt->execute([$bookingId, $userId, $userId]);
        $booking = $stmt->fetch();
        
        if (!$booking) {
            sendJSONResponse(false, 'Booking not found or access denied', [], 404);
        }
        
        // Verify receiver is the other party in the booking
        $otherPartyId = ($booking['renter_id'] == $userId) ? $booking['owner_id'] : $booking['renter_id'];
        if ($receiverId != $otherPartyId) {
            sendJSONResponse(false, 'Receiver must be the other party in this booking', [], 400);
        }
    }
    
    // Insert message
    $stmt = $pdo->prepare("
        INSERT INTO messages (sender_id, receiver_id, booking_id, message_text)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $receiverId, $bookingId, $messageText]);
    
    $messageId = $pdo->lastInsertId();
    
    // Get created message with user details
    $stmt = $pdo->prepare("
        SELECT m.*, 
               u1.full_name as sender_name,
               u2.full_name as receiver_name
        FROM messages m
        INNER JOIN users u1 ON m.sender_id = u1.user_id
        INNER JOIN users u2 ON m.receiver_id = u2.user_id
        WHERE m.message_id = ?
    ");
    $stmt->execute([$messageId]);
    $message = $stmt->fetch();
    
    sendJSONResponse(true, 'Message sent successfully', [
        'message' => $message
    ], 201);
    
} catch (PDOException $e) {
    error_log("Send Message Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while sending message', [], 500);
}

