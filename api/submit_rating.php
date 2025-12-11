<?php
/**
 * Submit Rating API
 * Allows users to rate equipment and other users after booking completion
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
$bookingId = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
$rating = isset($_POST['rating']) ? intval($_POST['rating']) : 0;
$comment = isset($_POST['comment']) ? sanitizeInput($_POST['comment']) : '';
$rateType = isset($_POST['rate_type']) ? sanitizeInput($_POST['rate_type']) : 'equipment'; // 'equipment' or 'user'

// Validation
$errors = [];

if ($bookingId <= 0) {
    $errors['booking_id'] = 'Invalid booking ID';
}

if ($rating < 1 || $rating > 5) {
    $errors['rating'] = 'Rating must be between 1 and 5';
}

if (!in_array($rateType, ['equipment', 'user'])) {
    $errors['rate_type'] = 'Invalid rate type';
}

if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

try {
    // Get booking details
    $stmt = $pdo->prepare("
        SELECT b.*, e.equipment_id, e.owner_id, b.renter_id
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        WHERE b.booking_id = ?
    ");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    
    if (!$booking) {
        sendJSONResponse(false, 'Booking not found', [], 404);
    }
    
    // Verify user is part of this booking
    if ($booking['renter_id'] != $userId && $booking['owner_id'] != $userId) {
        sendJSONResponse(false, 'You can only rate bookings you are part of', [], 403);
    }
    
    // Check if booking is completed
    if ($booking['status'] !== 'completed') {
        sendJSONResponse(false, 'You can only rate completed bookings', [], 400);
    }
    
    // Determine reviewee based on rate type and user role
    if ($rateType === 'equipment') {
        $revieweeId = $booking['equipment_id']; // For equipment rating, we store equipment_id
        $equipmentId = $booking['equipment_id'];
    } else {
        // Rating the other user
        $revieweeId = ($booking['renter_id'] == $userId) ? $booking['owner_id'] : $booking['renter_id'];
        $equipmentId = $booking['equipment_id'];
    }
    
    // Check if user already rated this booking
    $stmt = $pdo->prepare("
        SELECT rating_id 
        FROM ratings 
        WHERE booking_id = ? AND reviewer_id = ? AND equipment_id = ?
    ");
    $stmt->execute([$bookingId, $userId, $equipmentId]);
    $existingRating = $stmt->fetch();
    
    if ($existingRating) {
        // Update existing rating
        $stmt = $pdo->prepare("
            UPDATE ratings 
            SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP
            WHERE rating_id = ?
        ");
        $stmt->execute([$rating, $comment, $existingRating['rating_id']]);
        $ratingId = $existingRating['rating_id'];
    } else {
        // Create new rating
        $stmt = $pdo->prepare("
            INSERT INTO ratings (booking_id, reviewer_id, reviewee_id, equipment_id, rating, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$bookingId, $userId, $revieweeId, $equipmentId, $rating, $comment]);
        $ratingId = $pdo->lastInsertId();
    }
    
    // Update equipment average rating if rating equipment
    if ($rateType === 'equipment') {
        $stmt = $pdo->prepare("
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
            FROM ratings
            WHERE equipment_id = ?
        ");
        $stmt->execute([$equipmentId]);
        $ratingStats = $stmt->fetch();
        
        $stmt = $pdo->prepare("
            UPDATE equipment 
            SET rating = ?, updated_at = CURRENT_TIMESTAMP
            WHERE equipment_id = ?
        ");
        $stmt->execute([round($ratingStats['avg_rating'], 1), $equipmentId]);
    }
    
    // Get created/updated rating
    $stmt = $pdo->prepare("
        SELECT r.*, u.full_name as reviewer_name
        FROM ratings r
        INNER JOIN users u ON r.reviewer_id = u.user_id
        WHERE r.rating_id = ?
    ");
    $stmt->execute([$ratingId]);
    $ratingData = $stmt->fetch();
    
    sendJSONResponse(true, 'Rating submitted successfully', [
        'rating' => $ratingData
    ], 200);
    
} catch (PDOException $e) {
    error_log("Submit Rating Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while submitting rating', [], 500);
}

